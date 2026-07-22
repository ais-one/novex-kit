export interface ToolOutputField {
  field: string;
  label: string;
}

export const TOOL_OUTPUT_SCHEMAS: Record<string, ToolOutputField[]> = {
  generate_refund_pdf: [
    { field: 'pdf_path', label: 'PDF File Path' },
    { field: 'refund_ref', label: 'Refund Reference' },
    { field: 'refund_amount', label: 'Refund Amount' },
  ],
  openweather_get_weather: [
    { field: 'temp_celsius', label: 'Temperature (°C)' },
    { field: 'condition', label: 'Weather Condition' },
    { field: 'humidity', label: 'Humidity' },
    { field: 'wind_speed', label: 'Wind Speed' },
  ],
};

export function getToolOutputFields(toolName: string): ToolOutputField[] {
  return TOOL_OUTPUT_SCHEMAS[toolName] || [];
}
