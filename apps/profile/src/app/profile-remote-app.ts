import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProfilePage } from '@ns-studio/profile-ui';

@Component({
  selector: 'ns-profile-remote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfilePage],
  template: '<ns-profile />',
})
export class ProfileRemoteApp {}
