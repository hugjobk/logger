import { IncomingWebhook } from "@slack/webhook";
import { WebhookClient } from "discord.js";

export abstract class NotificationService {
  abstract notify(message: string): Promise<void>;
}

export class SlackNotificationService implements NotificationService {
  private readonly webhookClient: IncomingWebhook;

  constructor(webhookUrl: string) {
    this.webhookClient = new IncomingWebhook(webhookUrl);
  }

  async notify(message: string) {
    if (!message) return;

    await this.webhookClient.send({ text: message });
  }
}

export class DiscordNotificationService implements NotificationService {
  private readonly webhookClient: WebhookClient;

  constructor(webhookUrl: string) {
    this.webhookClient = new WebhookClient({
      url: webhookUrl,
    });
  }

  async notify(message: string) {
    if (!message) return;

    // Discord message length limit is 2000 characters
    for (let i = 0; i < message.length; i += 2000) {
      await this.webhookClient.send({
        content: message.substring(i, Math.min(i + 2000, message.length)),
      });
    }
  }
}
