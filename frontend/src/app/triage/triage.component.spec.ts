import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriageComponent } from './triage.component';
import { VaultService } from '../core/vault.service';
import { ExtensionService } from '../core/extension.service';
import { LayoutService } from '../core/layout.service';
import { AiService } from '../core/ai.service';

describe('TriageComponent', () => {
  let component: TriageComponent;
  let fixture: ComponentFixture<TriageComponent>;
  let vaultService: VaultService;
  let layoutService: LayoutService;
  let extensionService: ExtensionService;
  let aiService: AiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TriageComponent);
    component = fixture.componentInstance;
    vaultService = TestBed.inject(VaultService);
    layoutService = TestBed.inject(LayoutService);
    extensionService = TestBed.inject(ExtensionService);
    aiService = TestBed.inject(AiService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in hero state with manualMode false', () => {
    expect(component.manualMode()).toBeFalse();
    expect(component.matches().length).toBe(0);
    expect(component.analyzing()).toBeFalse();
  });

  it('toggles manual input textarea', () => {
    expect(component.showManualInput()).toBeFalse();
    component.toggleManualInput();
    expect(component.showManualInput()).toBeTrue();
    component.toggleManualInput();
    expect(component.showManualInput()).toBeFalse();
  });

  it('enters manual mode when continueManually is called without JD', () => {
    component.continueManually();
    expect(component.manualMode()).toBeTrue();
    expect(vaultService.selectedBulletIds().size).toBeGreaterThan(0);
  });

  it('extracts keywords but preserves vault summary and bullets when continueManually is called with JD', () => {
    const originalSummary = vaultService.vault().summary;
    component.jd.set('Senior Angular engineer skilled in TypeScript and frontend architecture');
    component.continueManually();

    expect(component.manualMode()).toBeTrue();
    expect(component.keywords().length).toBeGreaterThan(0);
    expect(component.source()).toBe('fallback');
    // Summary was not overwritten by generative AI
    expect(vaultService.tailoredSummary()).toBeNull();
    expect(vaultService.vault().summary).toBe(originalSummary);
  });

  it('switches layout tab to preview and invokes ext.exportPdf when exportPdf is clicked', () => {
    const layoutSpy = spyOn(layoutService, 'setActiveTab');
    const extSpy = spyOn(extensionService, 'exportPdf');

    component.exportPdf();

    expect(layoutSpy).toHaveBeenCalledWith('preview');
    expect(extSpy).toHaveBeenCalledWith(vaultService.vault().contact.fullName);
  });

  it('switches layout tab to vault when editProfile is called', () => {
    const layoutSpy = spyOn(layoutService, 'setActiveTab');
    component.editProfile();
    expect(layoutSpy).toHaveBeenCalledWith('vault');
  });

  it('extracts directly when user highlighted text', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo({
      text: 'Senior Rust Developer',
      isUserSelection: true,
    });
    const distillSpy = spyOn(aiService, 'distillJobDescription');

    await component.extractFromActiveTab();

    expect(component.jd()).toBe('Senior Rust Developer');
    expect(component.showManualInput()).toBeTrue();
    expect(distillSpy).not.toHaveBeenCalled();
  });

  it('distills job description with AI when page content is extracted and AI is available', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo({
      text: 'Header Nav\nStaff Engineer at Acme Corp\nBuild distributed systems\nFooter',
      isUserSelection: false,
    });
    spyOn(aiService, 'resolveActiveProvider').and.resolveTo({
      id: 'chrome-nano',
      name: 'Mock Provider',
      isAvailable: async () => true,
      generateJson: async <T>() => ({} as unknown as T),
    });
    spyOn(aiService, 'distillJobDescription').and.resolveTo({
      title: 'Staff Engineer',
      company: 'Acme Corp',
      description: 'Staff Engineer at Acme Corp. Build distributed systems.',
    });

    await component.extractFromActiveTab();

    expect(component.jd()).toBe('Staff Engineer at Acme Corp. Build distributed systems.');
    expect(component.showManualInput()).toBeTrue();
  });

  it('sets error message when extraction fails', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo(null);

    await component.extractFromActiveTab();

    expect(component.error()).toContain('Could not extract job description');
  });

  it('resets job and manual mode on resetJob', () => {
    component.jd.set('Some job');
    component.continueManually();
    expect(component.manualMode()).toBeTrue();

    component.resetJob();
    expect(component.jd()).toBe('');
    expect(component.keywords()).toEqual([]);
    expect(component.manualMode()).toBeFalse();
    expect(component.source()).toBeNull();
    expect(vaultService.tailoredSummary()).toBeNull();
  });

  it('shows Enhance with AI button in Keywords & Bullets only when ATS match is below 100%', async () => {
    await vaultService.ready;
    const firstSkill = vaultService.vault().skills[0] || 'TypeScript';
    component.keywords.set([firstSkill, 'NonExistentQuantumSkillXYZ']);
    fixture.detectChanges();

    const btnBelow = fixture.nativeElement.querySelector('section[aria-label="ATS keyword match"] .card-head button') as HTMLButtonElement | null;
    expect(btnBelow).toBeTruthy();
    expect(btnBelow?.textContent?.trim()).toBe('Enhance with AI');

    component.keywords.set([firstSkill]);
    fixture.detectChanges();

    const btnFull = fixture.nativeElement.querySelector('section[aria-label="ATS keyword match"] .card-head button');
    expect(btnFull).toBeNull();
  });

  it('enhances summary, skills, and bullet proposals when enhanceMissingKeywords is called', async () => {
    await vaultService.ready;
    const firstSkill = vaultService.vault().skills[0] || 'TypeScript';
    component.jd.set('Looking for Kubernetes and GraphQL experience');
    component.keywords.set([firstSkill, 'Kubernetes', 'GraphQL']);
    fixture.detectChanges();

    const enhanceSpy = spyOn(aiService, 'enhanceWithMissingKeywords').and.resolveTo({
      summary: 'Enhanced summary with Kubernetes and GraphQL.',
      proposedBullets: ['Deployed microservices on Kubernetes with GraphQL APIs.'],
      suggestedSkills: ['Kubernetes', 'GraphQL'],
    });

    await component.enhanceMissingKeywords();
    fixture.detectChanges();

    expect(enhanceSpy).toHaveBeenCalled();
    expect(vaultService.tailoredSummary()).toBe('Enhanced summary with Kubernetes and GraphQL.');
    expect(vaultService.tailoredSkills()).toContain('Kubernetes');
    expect(vaultService.tailoredSkills()).toContain('GraphQL');
    const firstExpId = vaultService.vault().experience[0].id;
    expect(component.proposals()[firstExpId]).toEqual(['Deployed microservices on Kubernetes with GraphQL APIs.']);
    expect(component.matchedCount()).toBe(component.matches().length);
  });

  it('counts keywords covered in certifications toward ATS match', async () => {
    await vaultService.ready;
    vaultService.update((v) => {
      v.certifications.push({
        id: 'cert_1',
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        year: '2024',
      });
    });
    component.keywords.set(['AWS']);
    fixture.detectChanges();

    expect(component.matches()[0].inCerts).toBeTrue();
    expect(component.matchedCount()).toBe(1);
    expect(component.uncoveredKeywords()).toEqual([]);
  });
});
