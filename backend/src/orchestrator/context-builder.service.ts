// ─────────────────────────────────────────────────────────────────────────────
// Stage 2: Context Builder
// Assembles structured context from PostgreSQL before Gemini is called.
// Only fetches relevant data — never dumps entire DB into the prompt.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '../database/prisma';
import { OrchestratorContext, OrchestratorInput, ConversationTurn } from './orchestrator.types';
import { logger } from '../config/logger';
import { getStadium } from '../providers/stadium-data.provider';
import { providers } from '../providers/context.providers';

const hasDatabase = Boolean(process.env.DATABASE_URL);

export class ContextBuilderService {
  async build(input: OrchestratorInput): Promise<OrchestratorContext> {
    const context: OrchestratorContext = {};

    // Always build from stadium JSON fixtures (offline-capable)
    this.buildFromStadiumData(context);

    // Optionally enrich from database if available
    if (hasDatabase) {
      await Promise.all([
        this.loadStadiumContext(input.stadiumId, context),
        this.loadEventContext(input.eventId, context),
        this.loadConversationContext(input.conversationHistory, context),
      ]);
    }

    // Fetch live telemetry from providers
    await this.fetchLiveTelemetry(input, context);

    if (input.accessibilityProfile) {
      const profile = input.accessibilityProfile as Record<string, string>;
      const needs = Object.entries(profile)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      context.userAccessibilityNeeds = needs || undefined;
    }

    logger.debug(`[ContextBuilder] Built context for requestId: ${input.requestId}`);
    return context;
  }

  private buildFromStadiumData(context: OrchestratorContext): void {
    try {
      const stadium = getStadium();
      context.stadiumName = `${stadium.name} (${stadium.city}) — Capacity: ${String(stadium.capacity)}`;
      context.zones = Object.keys(stadium.zones);
      context.facilities = stadium.facilities.map((f) => {
        const name = f.names?.en || f.id;
        return `${name} (${f.type})`;
      });
    } catch (err) {
      logger.warn(`[ContextBuilder] Could not build from stadium data: ${String(err)}`);
    }
  }

  private async fetchLiveTelemetry(
    input: OrchestratorInput,
    context: OrchestratorContext
  ): Promise<void> {
    const results = await Promise.allSettled([
      providers.gps.getCurrentLocation(input.userId),
      providers.ticket.getTicket(input.userId),
      providers.weather.getWeather(),
      providers.parking.getParkingStatus(),
    ]);

    if (results[0].status === 'fulfilled') context.currentLocation = results[0].value as Record<string, unknown>;
    if (results[1].status === 'fulfilled') context.ticket = results[1].value as Record<string, unknown>;
    if (results[2].status === 'fulfilled') context.weather = results[2].value as Record<string, unknown>;
    if (results[3].status === 'fulfilled') context.parking = results[3].value as Record<string, unknown>;
  }

  private async loadStadiumContext(
    stadiumId: string | undefined,
    context: OrchestratorContext
  ): Promise<void> {
    if (!stadiumId) return;
    try {
      const stadium = await prisma.stadium.findUnique({
        where: { id: stadiumId },
        select: { name: true, city: true, country: true, capacity: true },
      });
      if (stadium) {
        context.stadiumName = `${stadium.name} (${stadium.city}, ${stadium.country}) — Capacity: ${String(stadium.capacity)}`;
      }

      const zones = await prisma.zone.findMany({
        where: { stadiumId },
        select: { name: true },
        take: 20,
      });
      context.zones = zones.map((z) => z.name);

      const facilities = await prisma.facility.findMany({
        where: { stadiumId },
        select: { name: true, type: true },
        take: 30,
      });
      context.facilities = facilities.map((f) => `${f.name} (${f.type})`);
    } catch (err) {
      logger.warn(`[ContextBuilder] Could not load stadium context: ${String(err)}`);
    }
  }

  private async loadEventContext(
    eventId: string | undefined,
    context: OrchestratorContext
  ): Promise<void> {
    if (!eventId) return;
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { title: true, status: true, startTime: true, endTime: true },
      });
      if (event) {
        context.eventTitle = event.title;
        context.eventStatus = event.status;
      }
    } catch (err) {
      logger.warn(`[ContextBuilder] Could not load event context: ${String(err)}`);
    }
  }

  private loadConversationContext(
    history: ConversationTurn[] | undefined,
    context: OrchestratorContext
  ): Promise<void> {
    if (!history || history.length === 0) return Promise.resolve();
    // Take last 6 turns to stay within token budget
    const recent = history.slice(-6);
    context.recentConversation = recent.map((t) => `${t.sender}: ${t.message}`).join('\n');
    return Promise.resolve();
  }
}
