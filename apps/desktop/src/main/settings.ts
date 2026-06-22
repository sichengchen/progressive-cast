import type { DesktopSettings } from "../shared/types";
import type { LocalDatabase } from "./db";

export class SettingsService {
  constructor(private readonly db: LocalDatabase) {}

  async get(): Promise<DesktopSettings> {
    return this.db.getSettings();
  }

  async set(settings: DesktopSettings): Promise<DesktopSettings> {
    return this.db.setSettings(settings);
  }
}
