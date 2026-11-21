import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { LucideCpu, LucideDynamicIcon, LucideExternalLink, LucideShieldCheck, LucideZap } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';
import { CollapsibleComponent } from '../collapsible/collapsible.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ButtonComponent, CollapsibleComponent, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  readonly closed = output<void>();

  readonly externalIcon = LucideExternalLink.icon;
  readonly shieldIcon = LucideShieldCheck.icon;
  readonly cpuIcon = LucideCpu.icon;
  readonly zapIcon = LucideZap.icon;

  readonly licenses = [
    { name: 'Angular', license: 'MIT', url: 'https://angular.dev' },
    { name: 'Lucide Icons', license: 'ISC', url: 'https://lucide.dev' },
    { name: 'RxJS', license: 'Apache-2.0', url: 'https://rxjs.dev' },
    { name: 'Zone.js', license: 'MIT', url: 'https://github.com/angular/angular' },
    { name: 'tslib', license: '0BSD', url: 'https://www.typescriptlang.org' },
    { name: 'Fontsource (Inter, JetBrains Mono, Lora, Poppins)', license: 'OFL-1.1', url: 'https://fontsource.org' },
  ];
}
