import twilio from "twilio";
import { env } from "../config/env.js";

export interface AbnormalReadingAlertParams {
  hiveId: string;
  deviceId: string;
  sensorName: string;
  actualValue: string | number;
  expectedRange: string;
  timestamp?: Date;
  to?: string;
  conditionKey?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  throttled?: boolean;
}

export type MockSmsSender = (to: string, body: string) => Promise<SendSmsResult>;

export class NotificationService {
  private client: twilio.Twilio | null = null;
  private smsCooldownMap = new Map<string, number>();
  private mockSender: MockSmsSender | null = null;

  constructor() {
    this.initTwilio();
  }

  private initTwilio(): void {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken && accountSid.startsWith("AC")) {
      try {
        this.client = twilio(accountSid, authToken);
      } catch (err: any) {
        console.warn(`[NotificationService] Twilio client initialization failed: ${err.message}`);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  /**
   * Sets a mock SMS sender function for testing purposes.
   * When set, all SMS transmissions will be routed through this handler.
   */
  public setMockSender(mock: MockSmsSender | null): void {
    this.mockSender = mock;
  }

  /**
   * Clears the in-memory SMS cooldown cache (primarily for unit test isolation).
   */
  public clearCooldowns(): void {
    this.smsCooldownMap.clear();
  }

  /**
   * Formats a Date object into local Indian Standard Time (IST, UTC+05:30):
   * Example output: "11 Sep 2026, 21:45 IST"
   */
  public formatIstTime(date: Date = new Date()): string {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Compute UTC time in milliseconds then add IST offset (+05:30 = 330 minutes)
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    const istMs = utcMs + 330 * 60000;
    const istDate = new Date(istMs);

    const day = istDate.getDate();
    const month = months[istDate.getMonth()];
    const year = istDate.getFullYear();
    const hours = String(istDate.getHours()).padStart(2, "0");
    const minutes = String(istDate.getMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes} IST`;
  }

  /**
   * Low-level SMS transmission method. Dispatches via Twilio or mock sender.
   * Handles errors gracefully and never throws unhandled exceptions.
   */
  public async sendSms(to: string, body: string): Promise<SendSmsResult> {
    // 1. Check if mock sender is configured (e.g. during test suites)
    if (this.mockSender) {
      try {
        return await this.mockSender(to, body);
      } catch (mockErr: any) {
        console.error(`[NotificationService] Mock SMS sender threw: ${mockErr.message}`);
        return { success: false, error: mockErr.message };
      }
    }

    // 2. Validate configuration
    const fromNumber = env.TWILIO_FROM_NUMBER;
    if (!this.client || !fromNumber) {
      console.warn(
        `[NotificationService] Twilio SMS skipped: credentials or from number not configured (SID: ${
          env.TWILIO_ACCOUNT_SID ? "set" : "missing"
        }, FROM: ${fromNumber || "missing"})`
      );
      return { success: false, error: "Twilio credentials or FROM number not configured" };
    }

    if (!to || !to.trim()) {
      return { success: false, error: "Recipient phone number is required" };
    }

    // 3. Dispatch SMS via Twilio official SDK
    try {
      const message = await this.client.messages.create({
        body,
        from: fromNumber,
        to: to.trim(),
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (err: any) {
      console.error(`[NotificationService] Twilio SMS dispatch failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * High-level abnormal sensor reading alert dispatcher.
   * Constructs the structured emergency message and enforces cooldown deduplication.
   */
  public async sendAbnormalReadingAlert(
    params: AbnormalReadingAlertParams
  ): Promise<SendSmsResult> {
    const {
      hiveId,
      deviceId,
      sensorName,
      actualValue,
      expectedRange,
      timestamp = new Date(),
      to = env.TWILIO_ALERT_TO_NUMBER,
      conditionKey,
    } = params;

    const recipient = to || env.TWILIO_ALERT_TO_NUMBER || "+18005550199";
    if (!recipient) {
      console.warn("[NotificationService] No alert destination number configured for abnormal SMS alert");
      return { success: false, error: "No recipient phone number configured (TWILIO_ALERT_TO_NUMBER)" };
    }

    // Deduplication key per hive, device, sensor, and condition
    const condition = conditionKey || (typeof actualValue === "number" ? (actualValue > 0 ? "high" : "low") : "malformed");
    const cooldownKey = `${hiveId}:${deviceId}:${sensorName}:${condition}`;

    const now = Date.now();
    const cooldownMs = (env.TWILIO_SMS_COOLDOWN_SECONDS || 900) * 1000;
    const lastSentAt = this.smsCooldownMap.get(cooldownKey);

    if (lastSentAt && now - lastSentAt < cooldownMs) {
      const remainingSec = Math.round((cooldownMs - (now - lastSentAt)) / 1000);
      return {
        success: false,
        throttled: true,
        error: `SMS alert for ${cooldownKey} throttled by active cooldown (${remainingSec}s remaining)`,
      };
    }

    // Format dynamic SMS body according to exact specification
    const timeFormatted = this.formatIstTime(timestamp);
    const body = [
      "🚨 HoneyChain Alert",
      `Hive: ${hiveId}`,
      `Device: ${deviceId}`,
      `Abnormal ${sensorName} reading: ${actualValue}`,
      `Expected range: ${expectedRange}`,
      `Time: ${timeFormatted}`,
      "Please inspect the hive/device.",
    ].join("\n");

    const result = await this.sendSms(recipient, body);

    if (result.success) {
      this.smsCooldownMap.set(cooldownKey, now);
    }

    return result;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
