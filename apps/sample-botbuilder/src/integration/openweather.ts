import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

export default function initOpenWeatherTools(server: McpServer) {
  const registerTool = (
    server as unknown as {
      registerTool: (
        name: string,
        meta: { title: string; description: string; inputSchema: Record<string, unknown> },
        handler: ToolHandler,
      ) => void;
    }
  ).registerTool;

  registerTool(
    'openweather_get_weather',
    {
      title: 'Get Current Weather',
      description: 'Get current weather for a city by name. Returns temperature, conditions, and humidity.',
      inputSchema: { city: z.string().describe('City name, e.g. "Jakarta", "Tokyo", "London"') },
    },
    async ({ city }) => {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return { isError: true, content: [{ type: 'text', text: 'OPENWEATHER_API_KEY not configured' }] };
      }

      const url = `${BASE_URL}/weather?q=${encodeURIComponent(String(city))}&appid=${apiKey}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Weather API error: ${res.status} ${res.statusText}` }],
        };
      }

      const data = (await res.json()) as Record<string, unknown>;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              city: data.name,
              temp_celsius: (data.main as Record<string, number>).temp,
              feels_like: (data.main as Record<string, number>).feels_like,
              humidity: `${(data.main as Record<string, number>).humidity}%`,
              condition: (data.weather as Array<Record<string, string>>)[0].description,
              wind_speed: `${(data.wind as Record<string, number>).speed} m/s`,
            }),
          },
        ],
      };
    },
  );

  registerTool(
    'openweather_get_forecast',
    {
      title: 'Get Weather Forecast',
      description: 'Get a 5-day weather forecast for a city by name.',
      inputSchema: { city: z.string().describe('City name, e.g. "Jakarta", "Tokyo", "London"') },
    },
    async ({ city }) => {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return { isError: true, content: [{ type: 'text', text: 'OPENWEATHER_API_KEY not configured' }] };
      }

      const url = `${BASE_URL}/forecast?q=${encodeURIComponent(String(city))}&appid=${apiKey}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Weather API error: ${res.status} ${res.statusText}` }],
        };
      }

      const data = (await res.json()) as Record<string, unknown>;
      const list = data.list as Array<Record<string, unknown>>;
      const forecast = list.slice(0, 8).map(item => ({
        time: item.dt_txt,
        temp: (item.main as Record<string, number>).temp,
        condition: (item.weather as Array<Record<string, string>>)[0].description,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(forecast) }] };
    },
  );
}
