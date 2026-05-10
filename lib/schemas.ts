import { z } from 'zod';

export const draftSchema = z.object({
  sms_draft: z
    .string()
    .min(20)
    .max(360)
    .describe('SMS message text, conversational, opens with name and project reference'),
  email_subject: z.string().min(3).max(120).describe('Email subject line, 5-9 words'),
  email_body: z.string().min(40).max(1200).describe('Email body, 3-5 sentences, plain text'),
  call_opener: z.string().min(20).max(360).describe('1-2 sentences for Marcus to read on a call'),
  rationale: z.string().min(20).max(600).describe('Why this approach, recommended next move'),
});

export type DraftPayload = z.infer<typeof draftSchema>;

export const replyClassificationSchema = z.object({
  classification: z.enum(['hot', 'warm', 'not_interested', 'manual_review']),
  reason: z.string().min(5).max(400),
});

export type ReplyClassificationPayload = z.infer<typeof replyClassificationSchema>;
