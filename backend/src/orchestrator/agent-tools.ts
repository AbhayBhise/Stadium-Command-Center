import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const agentTools: FunctionDeclaration[] = [
  {
    name: 'getParkingData',
    description: 'Retrieves current parking availability, zone info, and walking time.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getGPSData',
    description: "Retrieves the user's current GPS location coordinates.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getCrowdData',
    description: 'Retrieves crowd density and wait times for a specific location or gate.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        location: {
          type: SchemaType.STRING,
          description: 'The location to check, e.g., "Gate 6"',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'getFacilityData',
    description:
      'Retrieves nearest facilities (WASHROOM, FOOD, HELP_DESK) including queue times and distance.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: 'Type of facility: WASHROOM, FOOD, or HELP_DESK',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'getMedicalData',
    description:
      'Retrieves emergency and medical contact information, including ETA and nearest AED.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getStaffData',
    description: 'Retrieves staff directory for guest services and medical desk.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getTicketData',
    description: 'Retrieves ticket data (section, row, seat, gate) for the user.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getWeatherData',
    description: 'Retrieves real-time weather and forecast data for the stadium.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];
