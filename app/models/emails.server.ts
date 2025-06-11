import { z } from 'zod';
import { Env } from './environment';
import { getErrorMessage } from './errors';

export async function sendVerificationEmail(
  email: string,
  token: string,
  transactionId: string,
  valuerName?: string,
  clientName?: string,
  plotNumber?: string,
  urlLink?: string,
  contactPhone?: string,
  senderCompany?: string,
  valuerCompany?: string,
  declineReason?: string,
  recipientName?: string,
  companyName?: string,
  recipientEmail?: string,
  domain?: string,


) {
  const Schema = z.discriminatedUnion('success', [
    z.object({ success: z.literal(true) }),
    z.object({
      success: z.literal(false),
      error: z.object({ path: z.string(), message: z.string() }),
      transactionalId: z.string(),
    }),
  ]);

  try {
    const url = 'https://app.loops.so/api/v1/transactional';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Env.LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionalId: transactionId,
        email,
        dataVariables: {
          productName: 'The Valua',
          token,
          host: Env.LOOPS_HOST,
          valuerName: valuerName || '',
          clientName: clientName || '',
          plotNumber: plotNumber || '',
          urlLink: urlLink || '',
          contactPhone: contactPhone || '',
          senderCompany: senderCompany || '',
          valuerCompany: valuerCompany || '',
          declineReason: declineReason || '',
          recipientName: recipientName || '',
          companyName: companyName || '',
          recipientEmail: recipientEmail || '',
          domain: domain || '',
        },
      }),
    });

    const rawResponse = await response.json();
    console.log('Raw API Response:', rawResponse);

    const result = Schema.safeParse(rawResponse);
    if (!result.success) {
      console.error('Schema validation failed:', result.error);
      throw new Error('Invalid response structure from the API');
    }

    if (!result.data.success) {
      throw new Error(result.data.error.message);
    }
    return undefined;
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    return new Error(getErrorMessage(error));
  }
}