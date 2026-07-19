export class EventProvider {
  async getEventContext() {
    return Promise.resolve({
      event: 'FIFA World Cup 2026',
      match: 'England vs Brazil',
      venue: 'Wembley Stadium',
      kickoff: '19:30',
      currentMinute: 'T-42',
      expectedAttendance: 89400,
    });
  }
}

export const eventProvider = new EventProvider();
