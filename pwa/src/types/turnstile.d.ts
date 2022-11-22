declare namespace Turnstile {
  interface RenderParameters {
    sitekey: string;
    action?: string;
    cData?: string;
    callback?: (token: string) => void;
    'expired-callback'?: (token: string) => void;
    'timeout-callback'?: () => void;
    'error-callback'?: () => void;
    theme?: 'auto' | 'light' | 'dark';
    tabindex?: number;
    'response-field'?: boolean;
    'response-field-name'?: string;
    size?: 'normal' | 'compact';
  }

  interface Api {
    render(container: string | HTMLElement, params: RenderParameters): string | undefined;
    reset(widgetId: string): void;
    remove(widgetId: string): void;
    getResponse(widgetId: string): string | undefined;
  }
}

type OptionalTurnstileApi = null | Turnstile.Api;
