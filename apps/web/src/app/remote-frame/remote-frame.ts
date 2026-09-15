import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'ns-remote-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './remote-frame.html',
  styleUrl: './remote-frame.scss',
})
export class RemoteFrame {
  private readonly sanitizer = inject(DomSanitizer);

  readonly title = input.required<string>();
  readonly src = input.required<string>();
  protected readonly safeSrc = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.src()),
  );
}
