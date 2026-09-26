/// <reference types="vite/client" />

interface GameAPI {
  save(data: string): Promise<boolean>;
  load(): Promise<string | null>;
}

interface Window {
  gameAPI?: GameAPI;
}
