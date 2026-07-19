import { prisma } from '../database/prisma';
import { IntentType, KnowledgeChunk, RetrievedKnowledge } from './orchestrator.types';
import { logger } from '../config/logger';
import { getStadium } from '../providers/stadium-data.provider';

const MAX_DOCS = 10;
const MAX_CONTENT_LENGTH = 1000;
const hasDatabase = Boolean(process.env.DATABASE_URL);

export class KnowledgeRetrievalService {
  async retrieve(
    userQuery: string,
    intent: IntentType,
    stadiumId?: string
  ): Promise<RetrievedKnowledge> {
    const start = Date.now();
    let allChunks: KnowledgeChunk[] = [];

    if (hasDatabase) {
      try {
        const [stadiums, facilities, gates, events, knowledgeDocs] = await Promise.all([
          this.fetchStadiums(stadiumId),
          this.fetchFacilities(stadiumId),
          this.fetchGates(stadiumId),
          this.fetchEvents(stadiumId),
          this.fetchKnowledgeDocs(intent, stadiumId),
        ]);

        allChunks = [...stadiums, ...facilities, ...gates, ...events, ...knowledgeDocs];
      } catch (err) {
        logger.error(`[KnowledgeRetrieval] DB fetch failed: ${String(err)}`);
      }
    }

    // Always supplement with stadium fixture data (offline-capable)
    allChunks.push(...this.getStadiumFixtureKnowledge(intent));

    const scored = this.scoreDocuments(allChunks, userQuery);
    const top = scored.slice(0, MAX_DOCS);

    return {
      documents: top,
      retrievalDurationMs: Date.now() - start,
    };
  }

  private getStadiumFixtureKnowledge(intent: IntentType): KnowledgeChunk[] {
    try {
      const stadium = getStadium();
      const chunks: KnowledgeChunk[] = [];

      // Stadium overview
      chunks.push({
        id: 'stadium-overview',
        title: stadium.name,
        documentType: 'Stadium',
        content: `${stadium.name} (${stadium.fifa_name}) in ${stadium.city}. Capacity: ${String(stadium.capacity)}. Zones: ${Object.keys(stadium.zones).join(', ')}.`,
        relevanceScore: 0,
      });

      // Facilities by intent
      const intentTypeMap: Record<string, string[]> = {
        FACILITY_SEARCH: ['restroom', 'accessible_restroom', 'concession', 'water', 'first_aid', 'sensory_room', 'guest_services'],
        NAVIGATION: ['gate', 'exit', 'seat'],
        ACCESSIBILITY: ['accessible_restroom', 'sensory_room', 'elevator'],
        EMERGENCY: ['first_aid', 'exit', 'guest_services'],
        PLANNING: ['concession', 'restroom', 'gate', 'seat', 'exit'],
        CROWD_QUERY: ['gate', 'concourse'],
        VOLUNTEER_HELP: ['guest_services', 'first_aid'],
        GENERAL: [],
      };

      const relevantTypes = new Set(intentTypeMap[intent] || []);
      for (const facility of stadium.facilities) {
        if (relevantTypes.size === 0 || relevantTypes.has(facility.type)) {
          const name = facility.names?.en || facility.id;
          const crowd = stadium.baseCrowd(facility.zone);
          chunks.push({
            id: `fixture-${facility.id}`,
            title: name,
            documentType: 'Facility',
            content: `${name} (${facility.type}) in zone ${facility.zone}. Accessible: ${facility.accessible ? 'Yes' : 'No'}. Base crowd: ${crowd}.`,
            relevanceScore: 0,
          });
        }
      }

      return chunks;
    } catch {
      return [];
    }
  }

  private async fetchStadiums(stadiumId?: string): Promise<KnowledgeChunk[]> {
    const where = stadiumId ? { id: stadiumId } : undefined;
    const records = await prisma.stadium.findMany({ where, take: 5 });
    return records.map((r) => ({
      id: r.id,
      title: r.name,
      documentType: 'Stadium',
      content: `Stadium: ${r.name}, Capacity: ${String(r.capacity)}, Location: ${r.city}, ${r.country}. ${r.description ?? ''}`,
      relevanceScore: 0,
    }));
  }

  private async fetchFacilities(stadiumId?: string): Promise<KnowledgeChunk[]> {
    const where = stadiumId ? { stadiumId } : undefined;
    const records = await prisma.facility.findMany({ where, take: 20 });
    return records.map((r) => ({
      id: r.id,
      title: r.name,
      documentType: 'Facility',
      content: `Facility: ${r.name}, Type: ${r.type}.`,
      relevanceScore: 0,
    }));
  }

  private async fetchGates(stadiumId?: string): Promise<KnowledgeChunk[]> {
    if (!stadiumId) return [];
    const records = await prisma.gate.findMany({
      where: { zone: { stadiumId } },
      include: { zone: true },
      take: 20,
    });
    return records.map((r) => ({
      id: r.id,
      title: `Gate ${r.gateNumber}`,
      documentType: 'Gate',
      content: `Gate ${r.gateNumber} located in ${r.zone.name}. Accessible: ${r.accessibilitySupported ? 'Yes' : 'No'}.`,
      relevanceScore: 0,
    }));
  }

  private async fetchEvents(stadiumId?: string): Promise<KnowledgeChunk[]> {
    const where = stadiumId ? { stadiumId } : undefined;
    const records = await prisma.event.findMany({ where, take: 5 });
    return records.map((r) => ({
      id: r.id,
      title: r.title,
      documentType: 'Event',
      content: `Event: ${r.title}. Status: ${r.status}. Time: ${r.startTime.toISOString()} to ${r.endTime.toISOString()}. ${r.description ?? ''}`,
      relevanceScore: 0,
    }));
  }

  private async fetchKnowledgeDocs(
    intent: IntentType,
    stadiumId?: string
  ): Promise<KnowledgeChunk[]> {
    const relevantTypes = this.getIntentDocTypes(intent);
    const where = stadiumId
      ? { stadiumId, documentType: { in: relevantTypes } }
      : { documentType: { in: relevantTypes } };

    const records = await prisma.knowledgeDocument.findMany({ where, take: 20 });
    return records.map((r) => ({
      id: r.id,
      title: r.title,
      documentType: r.documentType,
      content: r.content,
      relevanceScore: 0,
    }));
  }

  private getIntentDocTypes(intent: IntentType): string[] {
    const mapping: Record<IntentType, string[]> = {
      NAVIGATION: ['Stadium Rules', 'Parking Instructions', 'Accessibility Guide'],
      ACCESSIBILITY: ['Accessibility Guide', 'Stadium Rules'],
      CROWD_QUERY: ['Stadium Rules', 'Emergency SOP'],
      VOLUNTEER_HELP: ['Volunteer Guide', 'Emergency SOP', 'Stadium Rules'],
      PLANNING: ['Parking Instructions', 'Stadium Rules', 'Accessibility Guide', 'FAQ'],
      EMERGENCY: ['Emergency SOP', 'Stadium Rules'],
      FACILITY_SEARCH: ['Stadium Rules', 'Accessibility Guide', 'FAQ'],
      GENERAL: ['Stadium Rules', 'Volunteer Guide', 'FAQ'],
      TICKETS: ['Stadium Rules', 'FAQ'],
      FAQ: ['FAQ'],
    };
    return mapping[intent];
  }

  private scoreDocuments(docs: KnowledgeChunk[], query: string): KnowledgeChunk[] {
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\\W+/)
        .filter((w) => w.length > 2)
    );

    if (queryWords.size === 0) return docs;

    return (
      docs
        .map((doc) => {
          const docText = (doc.title + ' ' + doc.content).toLowerCase();
          // Count how many unique query words appear in the document
          let overlapCount = 0;
          for (const qw of queryWords) {
            if (docText.includes(qw)) overlapCount++;
          }

          const relevanceScore = Math.min(overlapCount / queryWords.size, 1.0);

          return {
            ...doc,
            content: doc.content.slice(0, MAX_CONTENT_LENGTH),
            relevanceScore,
          };
        })
        // Only return documents with at least some relevance, unless it's an exact match intent
        .filter((doc) => doc.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
    );
  }
}
