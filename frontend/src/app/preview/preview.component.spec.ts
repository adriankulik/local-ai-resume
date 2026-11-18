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

  it('adds a bullet to the resume and prompts to update the source of truth', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    const expId = vs.vault().experience[0].id;
    const initialVaultBulletCount = vs.vault().experience[0].bullets.length;

    comp.toggleEditMode();
    comp.setBulletDraft(expId, 'Built visual resume editor');
    comp.addResumeBullet(expId);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Built visual resume editor');
    expect(comp.pendingVaultPrompt()).toBeTruthy();
    expect(el.querySelector('.vault-sync-banner')?.textContent).toContain('Master Career Vault');

    // Keep for this resume only: vault remains unchanged
    comp.dismissVaultPrompt();
    fixture.detectChanges();
    expect(comp.pendingVaultPrompt()).toBeNull();
    expect(vs.vault().experience[0].bullets.length).toBe(initialVaultBulletCount);
    expect(el.textContent).toContain('Built visual resume editor');
  });

  it('updates the Master Career Vault when user confirms the source-of-truth prompt', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    const initialSkillCount = vs.vault().skills.length;

    comp.toggleEditMode();
    comp.newSkill.set('Playwright');
    comp.addResumeSkill();
    fixture.detectChanges();

    expect(comp.skills()).toContain('Playwright');
    expect(vs.vault().skills.length).toBe(initialSkillCount);

    comp.confirmVaultPrompt();
    fixture.detectChanges();

    expect(comp.pendingVaultPrompt()).toBeNull();
    expect(vs.vault().skills).toContain('Playwright');
  });

  it('deletes items from the resume without deleting them from the Master Career Vault', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    const exp = vs.vault().experience[0];
    const bulletId = exp.bullets[0].id;
    const eduId = vs.vault().education[0].id;

    comp.removeResumeBullet(exp.id, bulletId);
    comp.removeResumeEducation(eduId);
    fixture.detectChanges();

    expect(vs.selectedBulletIds().has(bulletId)).toBeFalse();
    expect(vs.vault().experience[0].bullets.some((b) => b.id === bulletId)).toBeTrue();
    expect(vs.visibleEducation().some((e) => e.id === eduId)).toBeFalse();
    expect(vs.vault().education.some((e) => e.id === eduId)).toBeTrue();
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
