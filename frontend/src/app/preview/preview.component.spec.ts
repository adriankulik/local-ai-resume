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
    vs.update((v) => {
      v.experience.push({
        id: 'exp_1',
        role: 'Engineer',
        company: 'Acme',
        startDate: '2022-01',
        endDate: 'Present',
        bullets: [{ id: 'b_101', text: 'Shipped features' }],
      });
    });

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
    vs.update((v) => {
      v.experience.push({
        id: 'exp_1',
        role: 'Engineer',
        company: 'Acme',
        startDate: '2022-01',
        endDate: 'Present',
        bullets: [{ id: 'b_101', text: 'Shipped features' }],
      });
      v.education.push({
        id: 'edu_1',
        degree: 'B.Sc. CS',
        institution: 'State University',
        year: '2020',
      });
    });

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
    expect(liLink?.textContent).toContain('/in/janedoe');

    vs.vault().contact.linkedin = '   ';
    vs.touch();
    fixture.detectChanges();

    liLink = el.querySelector('a.r-contact__link--linkedin');
    expect(liLink).toBeNull();
  });

  it('renders the GitHub link with /{username} display and full href', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.vault().contact.github = 'janedoe';
    vs.touch();
    fixture.detectChanges();

    const ghLink = fixture.nativeElement.querySelector('a.r-contact__link--github') as HTMLAnchorElement | null;
    expect(ghLink).toBeTruthy();
    expect(ghLink?.getAttribute('href')).toBe('https://github.com/janedoe');
    expect(ghLink?.textContent).toContain('/janedoe');
  });

  it('shows or hides certification dates based on showCertificationDates setting', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.update((v) => {
      v.certifications.push({
        id: 'cert_1',
        name: 'AWS Solutions Architect',
        issuer: 'Amazon Web Services',
        year: '2024',
      });
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.r-certs')?.textContent).toContain('(2024)');

    comp.set('showCertificationDates', false);
    fixture.detectChanges();

    expect(el.querySelector('.r-certs')?.textContent).not.toContain('(2024)');
    expect(el.querySelector('.r-certs')?.textContent).toContain('AWS Solutions Architect');
  });

  it('renders markdown links in experience bullets as clickable anchor tags', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.update((v) => {
      v.experience.push({
        id: 'exp_1',
        role: 'Maintainer',
        company: 'Self-employment',
        startDate: '2020-01',
        endDate: 'Present',
        bullets: [
          {
            id: 'b_101',
            text: '[kmd-labs/design-system](https://github.com/kmd-labs/design-system): Unified Angular design system.',
          },
        ],
      });
    });
    vs.selectAll();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.r-bullet-link') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link?.textContent?.trim()).toBe('kmd-labs/design-system');
    expect(link?.getAttribute('href')).toBe('https://github.com/kmd-labs/design-system');
  });

  it('reorders experience roles and bullets in edit mode', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.update((v) => {
      v.experience = [
        {
          id: 'exp_1',
          role: 'Role A',
          company: 'Co A',
          startDate: '2020-01',
          endDate: '2021-01',
          bullets: [
            { id: 'b_1', text: 'First' },
            { id: 'b_2', text: 'Second' },
          ],
        },
        {
          id: 'exp_2',
          role: 'Role B',
          company: 'Co B',
          startDate: '2022-01',
          endDate: 'Present',
          bullets: [{ id: 'b_3', text: 'Third' }],
        },
      ];
    });
    vs.selectAll();
    comp.toggleEditMode();
    fixture.detectChanges();

    const moveRoleDown = fixture.nativeElement.querySelector('button[aria-label="Move role Role A down"]') as HTMLButtonElement | null;
    expect(moveRoleDown).toBeTruthy();
    moveRoleDown?.click();
    expect(vs.selectedExperience().map((e) => e.id)).toEqual(['exp_2', 'exp_1']);

    const moveBulletUp = fixture.nativeElement.querySelector('button[aria-label="Move bullet b_2 up"]') as HTMLButtonElement | null;
    expect(moveBulletUp).toBeTruthy();
    moveBulletUp?.click();
    expect(vs.selectedExperience()[1].bullets.map((b) => b.id)).toEqual(['b_2', 'b_1']);
  });

  it('renders email as mailto: and phone as tel: links in contact section', async () => {
    await TestBed.configureTestingModule({ imports: [PreviewComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PreviewComponent);
    const vs = TestBed.inject(VaultService);
    await vs.ready;

    vs.update((v) => {
      v.contact.email = 'ada@example.com';
      v.contact.phone = '+48 123 456 789';
    });
    fixture.detectChanges();

    const emailEl = fixture.nativeElement.querySelector('a.r-contact__link--email') as HTMLAnchorElement | null;
    const phoneEl = fixture.nativeElement.querySelector('a.r-contact__link--phone') as HTMLAnchorElement | null;
    expect(emailEl?.getAttribute('href')).toBe('mailto:ada@example.com');
    expect(emailEl?.textContent?.trim()).toBe('ada@example.com');
    expect(phoneEl?.getAttribute('href')).toBe('tel:+48123456789');
    expect(phoneEl?.textContent?.trim()).toBe('+48 123 456 789');
  });
});
