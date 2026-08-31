import MultiEnumFieldView from 'views/fields/multi-enum';

export default class BetterColumnsEntityListFieldView
    extends MultiEnumFieldView {

    setup() {
        const scopeList = Object.keys(
            this.getMetadata().get('scopes') || {}
        );

        this.params.options = scopeList
            .filter(scope => {
                const defs =
                    this.getMetadata().get(['scopes', scope]) || {};

                return Boolean(
                    defs.entity &&
                    defs.object &&
                    !defs.disabled &&
                    scope !== 'Settings'
                );
            })
            .sort((scopeA, scopeB) =>
                this.translate(scopeA, 'scopeNamesPlural')
                    .localeCompare(
                        this.translate(scopeB, 'scopeNamesPlural')
                    )
            );

        super.setup();
    }
}
