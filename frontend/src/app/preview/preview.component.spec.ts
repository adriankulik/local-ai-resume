import { TestBed } from '@angular/core/testing';
import { PreviewComponent } from './preview.component';
import { VaultService } from '../core/vault.service';

describe('PreviewComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('uses local photo wording when no photo is set', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const vs = TestBed.inject(VaultService);
    await vs.ready;
    vs.vault().contact.photoDataUrl = '';
    vs.touch();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Add a photo in the vault first');
    expect(el.textContent).not.toContain('Upload a photo in the vault first');
  });

  it('renders the LinkedIn link when provided and omits it when empty', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.vault().contact.linkedin = 'https://linkedin.com/in/janedoe';
    vs.touch();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    let liLink = el.querySelector('a.r-contact__link--linkedin') as HTMLAnchorElement | null;
    expect(liLink).toBeTruthy();
    expect(liLink?.getAttribute('href')).toBe('https://linkedin.com/in/janedoe');
    expect(liLink?.textContent).toContain('linkedin.com/in/janedoe');

    vs.vault().contact.linkedin = '   ';
    vs.touch();
    fixture.detectChanges();

    liLink = el.querySelector('a.r-contact__link--linkedin');
    expect(liLink).toBeNull();
  });
});
