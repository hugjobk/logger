import {
  ConsoleLogger,
  Inject,
  Injectable,
  LogLevel,
  Scope,
} from "@nestjs/common";
import { isLogLevelEnabled } from "@nestjs/common/services/utils";
import { inspect } from "util";
import { NOTIFICATION_LEVEL, NOTIFICATION_SERVICE } from "./constants";
import { NotificationService } from "./notification.service";

@Injectable({ scope: Scope.TRANSIENT })
export class Logger extends ConsoleLogger {
  constructor(
    @Inject(NOTIFICATION_LEVEL)
    private readonly notificationLevel: LogLevel,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService?: NotificationService
  ) {
    super();
  }

  private isNotificationEnabled(level: LogLevel) {
    return isLogLevelEnabled(level, [this.notificationLevel]);
  }

  errorf(message: any, optionalParams?: object) {
    this.error(formatMessage(message, optionalParams));
  }

  logf(message: any, optionalParams?: object) {
    this.log(formatMessage(message, optionalParams));
  }

  warnf(message: any, optionalParams?: object) {
    this.warn(formatMessage(message, optionalParams));
  }

  debugf(message: any, optionalParams?: object) {
    this.debug(formatMessage(message, optionalParams));
  }

  verbosef(message: any, optionalParams?: object) {
    this.verbose(formatMessage(message, optionalParams));
  }

  fatalf(message: any, optionalParams?: object) {
    this.fatal(formatMessage(message, optionalParams));
  }

  protected printMessages(
    messages: unknown[],
    context = "",
    logLevel: LogLevel = "log",
    writeStreamType: "stdout" | "stderr" = "stdout"
  ) {
    for (const message of messages) {
      const pidMessage = this.formatPid(process.pid);
      const contextMessage = this.formatContext(context);
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = logLevel.toUpperCase().padStart(7, " ");
      const formattedMessage = this.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        timestampDiff
      );

      process[writeStreamType].write(formattedMessage);

      if (this.notificationService && this.isNotificationEnabled(logLevel))
        this.notificationService
          .notify(removeColor(formattedMessage))
          .catch((error) => {
            super.printMessages(
              [`Failed to send notification: ${error}`],
              Logger.name,
              "error",
              "stderr"
            );
          });
    }
  }

  protected printStackTrace(stack: string) {
    super.printStackTrace(stack);

    if (this.notificationService)
      this.notificationService.notify(stack).catch((error) => {
        super.printMessages(
          [`Failed to send notification: ${error}`],
          Logger.name,
          "error",
          "stderr"
        );
      });
  }
}

function formatMessage(message: any, optionalParams?: object) {
  return optionalParams
    ? `${formatText(Color.FgWhite, message)} ${formatObject(optionalParams)}`
    : formatText(Color.FgWhite, message);
}

function formatObject(object: object) {
  const txt: string[] = [];

  for (const key in object) {
    const value = object[key];

    if (value === null || value === undefined) continue;

    txt.push(
      `${formatText(Color.FgCyan, key + "=")}${formatText(
        key === "error" ? Color.FgRed : Color.FgWhite,
        inspect(value, false, 10)
      )}`
    );
  }

  return txt.join(" ");
}

enum Color {
  Reset = "\x1b[0m",
  FgRed = "\x1b[31m",
  FgCyan = "\x1b[36m",
  FgWhite = "\x1b[37m",
}

const isColorAllowed = () => !process.env.NO_COLOR;

const formatText = (color: Color, text: string) =>
  isColorAllowed() ? `${color}${text}${Color.Reset}` : text;

const ansiRegex = new RegExp(/\x1b\[[0-9;]*m/g);

const removeColor = (coloredText: string) => coloredText.replace(ansiRegex, "");
