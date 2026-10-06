/**
 * <aw-account-login data-view="login|recover"> — switches between the login form and the "reset password" form on
 * the customer login page without a reload, and moves focus to the heading of the view that appears.
 *
 * Links inside with data-view-link="login|recover" switch views. Without JavaScript the page still works: the
 * "Forgot your password?" link targets #recover (shown with :target in the section's stylesheet) and "Cancel" is a
 * normal link back to the login page.
 */
import { ThemeElement, define } from '@aw/component';

class AccountLogin extends ThemeElement {
  mount() {
    this.listen(this, 'click', (event) => {
      const link = /** @type {HTMLElement} */ (event.target).closest?.('[data-view-link]');
      if (!(link instanceof HTMLElement)) return;
      event.preventDefault();
      this.show(link.dataset.viewLink === 'recover' ? 'recover' : 'login', true);
    });

    if (window.location.hash === '#recover') this.show('recover', false);
  }

  /**
   * @param {'login' | 'recover'} view
   * @param {boolean} moveFocus - Focus the heading of the new view
   */
  show(view, moveFocus) {
    this.dataset.view = view;
    const url = view === 'recover' ? '#recover' : window.location.pathname + window.location.search;
    history.replaceState(history.state, '', url);
    if (moveFocus) this.ref(`${view}-heading`)?.focus();
  }
}

define('aw-account-login', AccountLogin);
