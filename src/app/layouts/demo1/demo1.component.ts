import { Component, HostBinding, AfterViewInit, OnDestroy, inject, Renderer2, DOCUMENT } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MetronicInitService } from '../../core/services/metronic-init.service';
import { AccessControlService } from '../../core/services/access-control.service';
import { ResponsiveTablesService } from '../../core/services/responsive-tables.service';
import { AiAssistantPanelComponent } from '../../partials/ai-assistant/ai-assistant-panel.component';
import { ModalsSearchComponent } from '../../partials/modals-search/modals-search.component';
import { ThemeToggleService } from '../../partials/theme-toggle/theme-toggle.service';
import { ToastHostComponent } from '../../shared/toast-host/toast-host.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
	selector: 'app-demo1',
	imports: [
		RouterOutlet,
		SidebarComponent,
		HeaderComponent,
		FooterComponent,
		ModalsSearchComponent,
		AiAssistantPanelComponent,
		ToastHostComponent,
	],
	templateUrl: './demo1.component.html',
	styleUrl: './demo1.component.scss'
})
export class Demo1Component implements AfterViewInit, OnDestroy {
	@HostBinding('class') class = 'flex grow';
	protected themeService = inject(ThemeToggleService);
	protected access = inject(AccessControlService);
	private metronicInitService = inject(MetronicInitService);
	private responsiveTables = inject(ResponsiveTablesService);
	private renderer = inject(Renderer2);
	private document = inject(DOCUMENT);

	ngAfterViewInit(): void {
		this.renderer.removeClass(this.document.body, 'kt-sidebar-collapse');
		this.metronicInitService.init();
		this.responsiveTables.start();
	}

	ngOnDestroy(): void {
		this.responsiveTables.stop();
	}
}
