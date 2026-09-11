import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CvPage } from '@latelier/cv-ui';

@Component({
  selector: 'latelier-cv-remote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CvPage],
  template: '<latelier-cv />',
})
export class CvRemoteApp {}
