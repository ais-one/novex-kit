import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { generateRefundPdf } from '../lib/pdf.ts';

export default function initPdfTools(server: McpServer) {
  // biome-ignore lint/suspicious/noExplicitAny: registerTool requires this binding
  const register = (server as any).registerTool.bind(server);

  register(
    'generate_refund_pdf',
    {
      title: 'Generate Refund PDF',
      description:
        'Generate a refund confirmation PDF document for a customer. Returns the file path of the generated PDF.',
      inputSchema: {
        customer_name: z.string().describe('Full name of the customer'),
        customer_email: z.string().describe('Email address of the customer'),
        customer_phone: z.string().describe('Phone number of the customer'),
        order_number: z.string().describe('Order number (e.g., MNV-20250115-0001)'),
        product_name: z.string().describe('Name of the product being refunded'),
        product_price: z.number().describe('Original price of the product in USD'),
        refund_reason: z.string().describe('Reason for the refund request'),
      },
    },
    async ({
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      product_name,
      product_price,
      refund_reason,
    }) => {
      const refundRef = `REF-${Date.now()}`;
      const refundAmount = Number(product_price) * 0.8;

      const filepath = generateRefundPdf({
        refundRef,
        customerName: String(customer_name),
        customerEmail: String(customer_email),
        customerPhone: String(customer_phone),
        orderNumber: String(order_number),
        productName: String(product_name),
        productPrice: Number(product_price),
        refundAmount,
        reason: String(refund_reason),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              refund_ref: refundRef,
              refund_amount: `$${refundAmount.toFixed(2)}`,
              original_price: `$${Number(product_price).toFixed(2)}`,
              refund_rate: '80%',
              pdf_path: filepath,
              message: `Refund confirmation generated. Ref #${refundRef}. Refund amount: $${refundAmount.toFixed(2)} (80% of $${Number(product_price).toFixed(2)})`,
            }),
          },
        ],
      };
    },
  );
}
