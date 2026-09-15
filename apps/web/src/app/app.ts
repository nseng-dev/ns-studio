import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

/**
 * La shell de la plateforme : navigation, routes principales, chargement des remotes.
 */
@Component({
  selector: 'ns-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="shell">
      <a class="shell__brand" routerLink="/profile">NS Studio</a>
      <nav class="shell__nav" aria-label="Modules">
        <a
          matButton="tonal"
          routerLink="/profile"
          routerLinkActive="shell__link--actif"
          class="shell__link"
        >
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
      background: var(--ns-fond, #fcfbff);
    }

    .shell {
      position: sticky;
      z-index: 10;
      inset-block-start: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-block-size: 4rem;
      padding: 0.75rem clamp(1rem, 4vw, 2.5rem);
      border-block-end: 1px solid var(--ns-trait, #d8d8d8);
      background: color-mix(in srgb, var(--ns-fond, #fcfbff), transparent 6%);
      backdrop-filter: blur(16px);
    }

    .shell__brand,
    .shell__link {
      color: inherit;
      text-decoration: none;
    }

    .shell__brand {
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    .shell__nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .shell__link {
      font-size: 0.95rem;
    }

    .shell__link--actif {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ns-accent, #7b2cbf), transparent 55%);
    }
  `,
})
export class App {}
