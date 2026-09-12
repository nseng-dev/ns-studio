import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProfilePage } from '@kinetiq/profile-ui';

@Component({
  selector: 'kinetiq-profile-remote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfilePage],
  template: '<kinetiq-profile />',
})
export class ProfileRemoteApp {}
