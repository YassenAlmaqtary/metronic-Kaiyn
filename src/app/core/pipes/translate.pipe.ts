import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslationKey } from '../i18n';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private language = inject(LanguageService);

  transform(key: TranslationKey): string {
    this.language.locale();
    return this.language.translate(key);
  }
}
