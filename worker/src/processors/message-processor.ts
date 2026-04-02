import { PrismaClient } from '@prisma/client';
import axios from 'axios';

/**
 * Process message sending jobs
 */
export async function processSendMessage(data: any, prisma: PrismaClient) {
  const { payload } = data;

  console.log('Processing send message job');

  // Implementation for direct message sending
  // This is used for manual messages from the dashboard

  const { workspaceId, to, message, conversationId } = payload;

  // Get WhatsApp integration
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    throw new Error('WhatsApp not connected');
  }

  // Send via WhatsApp API
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;

  const response = await axios.post(
    whatsappUrl,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const whatsappMessageId = response.data.messages[0].id;

  // Store message in database
  await prisma.message.create({
    data: {
      workspaceId,
      conversationId,
      direction: 'outbound',
      type: 'text',
      content: message,
      whatsappMessageId,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  console.log(`✅ Message sent: ${whatsappMessageId}`);
}
