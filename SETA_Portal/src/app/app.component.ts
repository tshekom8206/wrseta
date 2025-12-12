import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './core/services/storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class AppComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly storage = inject(StorageService);

  ngOnInit(): void {
    // Initialize language
    const savedLang = this.storage.getLanguage();
    this.translate.setDefaultLang('en');
    this.translate.use(savedLang);
  }
}
