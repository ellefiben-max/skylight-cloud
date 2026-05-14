import { prisma } from "./db";

export interface AuditParams {
  organizationId?: string;
  userId?: string;
  boardId?: string;
  eventType: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      boardId: params.boardId,
      eventType: params.eventType,
      detailsJson: JSON.stringify(params.details ?? {}),
      ipAddress: params.ipAddress ?? "",
      userAgent: params.userAgent ?? "",
    },
  });
}
