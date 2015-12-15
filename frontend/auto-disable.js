pc.script.create('auto_disable', function (app) {
    var Auto_disable = function (entity) {
        this.entity = entity;
    };

    Auto_disable.prototype = {
        initialize: function () {
            this.entity.enabled = false;
        }
    };

    return Auto_disable;
});