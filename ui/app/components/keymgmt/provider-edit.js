import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';

/**
 * @module KeymgmtKeyEdit
 * ProviderKeyEdit components are used to display KeyMgmt Secrets engine UI for Key items
 *
 * @example
 * ```js
 * <KeymgmtProviderEdit @model={model} @mode="show" />
 * ```
 * @param {object} model - model is the data from the store
 * @param {string} [mode=show] - mode controls which view is shown on the component
 * * @param {string} [tab=details] - Options are "details" or "keys" for the show mode only
 */

export default class KeymgmtKeyEdit extends Component {
  @service router;
  @service flashMessages;

  constructor() {
    super(...arguments);
    if (this.viewingKeys) {
      this.fetchKeys.perform();
    }
  }

  @tracked modelValidations;

  get isShowing() {
    return this.args.mode === 'show';
  }
  get isCreating() {
    return this.args.mode === 'create';
  }
  get viewingKeys() {
    return this.args.tab === 'keys';
  }

  @task
  *saveTask() {
    const { model } = this.args;
    try {
      yield model.save();
      this.router.transitionTo('vault.cluster.secrets.backend.show', model.id, {
        queryParams: { itemType: 'provider' },
      });
    } catch (error) {
      this.flashMessages.danger(error.errors.join('. '));
    }
  }
  @task
  *fetchKeys(page = 1) {
    try {
      yield this.args.model.fetchKeys(page);
    } catch (error) {
      this.flashMessages.danger(error.errors.join('. '));
    }
  }

  @action
  async onSave(event) {
    event.preventDefault();
    const { validations } = await this.args.model.validate();
    if (validations.isValid) {
      this.saveTask.perform();
    } else {
      // FormField expects validationMessages in a shape not output by ember-cp-validations
      this.modelValidations = validations.errors.reduce(
        (obj, e) => {
          if (e.attribute.includes('credentials')) {
            obj.credentials[e.attribute.split('.')[1]] = e.message;
          } else {
            obj[e.attribute] = e.message;
          }
          return obj;
        },
        { credentials: {} }
      );
    }
  }
  @action
  async onDelete() {
    try {
      const { model, root } = this.args;
      await model.destroyRecord();
      this.router.transitionTo(root.path, root.model, { queryParams: { tab: 'provider' } });
    } catch (error) {
      this.flashMessages.danger(error.errors.join('. '));
    }
  }
  @action
  async onDeleteKey(model) {
    try {
      await model.destroyRecord();
      this.args.model.keys.removeObject(model);
    } catch (error) {
      this.flashMessages.danger(error.errors.join('. '));
    }
  }
}