import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * La coquille de la plateforme.
 *
 * Elle est volontairement vide : tant qu'il n'y a qu'un module, une barre de navigation
 * n'aurait rien à proposer. Le jour où un deuxième module arrive, c'est ici que l'en-tête
 * commune se posera — et nulle part ailleurs.
 */
@Component({
  selector: 'latelier-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
