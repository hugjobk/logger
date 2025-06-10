import { DynamicModule, LOG_LEVELS, LogLevel, Module } from "@nestjs/common";
import { NOTIFICATION_LEVEL, NOTIFICATION_SERVICE } from "./constants";
import { Logger } from "./logger.service";
import {
  DiscordNotificationService,
  NotificationService,
  SlackNotificationService,
} from "./notification.service";

@Module({
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule {
  static register(options: {
    notification?: { level?: LogLevel } & (
      | { type: "auto" }
      | {
          type: "slack" | "discord";
          webhookUrl: string;
        }
    );
  }): DynamicModule {
    const notificationLevel = options.notification.level ?? "warn";

    if (!LOG_LEVELS.includes(notificationLevel))
      throw new Error(`Invalid NOTIFICATION_LEVEL: ${notificationLevel}`);

    let notificationService: NotificationService;

    if (options.notification) {
      switch (options.notification.type) {
        case "auto":
          if (process.env.SLACK_WEBHOOK_URL)
            notificationService = new SlackNotificationService(
              process.env.SLACK_WEBHOOK_URL
            );
          else if (process.env.DISCORD_WEBHOOK_URL)
            notificationService = new DiscordNotificationService(
              process.env.DISCORD_WEBHOOK_URL
            );
          break;
        case "slack":
          notificationService = new SlackNotificationService(
            options.notification.webhookUrl
          );
          break;
        case "discord":
          notificationService = new DiscordNotificationService(
            options.notification.webhookUrl
          );
          break;
      }
    }

    return {
      module: LoggerModule,
      providers: [
        {
          provide: NOTIFICATION_LEVEL,
          useValue: notificationLevel,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: notificationService,
        },
        Logger,
      ],
      exports: [Logger],
    };
  }
}
