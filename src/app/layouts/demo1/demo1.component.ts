import { Component, HostBinding, AfterViewInit, inject, Renderer2, DOCUMENT } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MetronicInitService } from '../../core/services/metronic-init.service';
import { ThemeToggleService } from '../../partials/theme-toggle/theme-toggle.service';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
	selector: 'app-demo1',
	imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent],
	templateUrl: './demo1.component.html',
	styleUrl: './demo1.component.scss'
})
export class Demo1Component implements AfterViewInit {
	@HostBinding('class') class = 'flex grow';
	protected themeService = inject(ThemeToggleService);//وظيفتى التى تعمل على التبديل بين الوضع الداكن والفاتح
	private metronicInitService = inject(MetronicInitService);//وظيفتى التى تعمل على التحميل المرة الاولى للموقع
	private renderer = inject(Renderer2);//وظيفتى التى تعمل على حذف الكلاس kt-sidebar-collapse	
	private document = inject(DOCUMENT);//وظيفتى التى تعمل على التحميل المرة الاولى للموقع

	ngAfterViewInit(): void {
		this.renderer.removeClass(this.document.body, 'kt-sidebar-collapse');//حذف الكلاس kt-sidebar-collapse
		this.metronicInitService.init();//تحميل الموقع
	}
}
