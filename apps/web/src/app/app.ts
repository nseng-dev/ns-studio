import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * La shell de la plateforme : navigation, routes principales, chargement des remotes.
 */
@Component({
  selector: 'kinetiq-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="shell">
      <a class="shell__brand" routerLink="/profile">Kinetiq</a>
      <nav class="shell__nav" aria-label="Modules">
        <a routerLink="/profile" routerLinkActive="shell__link--actif" class="shell__link">
          Profil
        </a>
      </nav>
    </header>

    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--kinetiq-fond, #faf9f7);
    }

    .shell {
      position: sticky;
      z-index: 10;
      inset-block-start: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-block-size: 3.25rem;
      padding: 0.75rem clamp(1rem, 4vw, 2.5rem);
      border-block-end: 1px solid color-mix(in srgb, var(--kinetiq-encre, #1a1a1c), transparent 86%);
      background: color-mix(in srgb, var(--kinetiq-fond, #faf9f7), white 8%);
    }

    .shell__brand,
    .shell__link {
      color: inherit;
      text-decoration: none;
    }

    .shell__brand {
      font-weight: 700;
    }

    .shell__nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .shell__link {
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      font-size: 0.95rem;
    }

    .shell__link--actif {
      background: color-mix(in srgb, var(--kinetiq-accent, #17564a), transparent 86%);
    }
  `,
})
export class App {}
