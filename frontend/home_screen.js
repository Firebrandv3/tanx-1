pc.script.attribute('html', 'asset', null, {
    type: 'html',
    max: 1
});

pc.script.attribute('css', 'asset', null, {
    type: 'css',
    max: 1
});

pc.script.create('home_screen', function (app) {
    
    var LOCAL_STORAGE_DISMISSED = 'add_home_screen_dismissed_count';
    var LOCAL_STORAGE_VIEW = 'add_home_screen_view_count';
        
    var Home_screen = function (entity) {
        this.entity = entity;
        this.element = null;
    };

    Home_screen.prototype = {    
        initialize: function () {
            if (! this.html) {
                console.error('Missing html asset');
                return;
            }
            
            if (! this.css) {
                console.error('Missing css asset');
                return;
            }
            
            this.storeView();
            
            if (this.shouldShow())
                this.createBubble();
        },
        
        storeView: function () {
            try {
                result = Number(window.localStorage[LOCAL_STORAGE_VIEW]) || 0;
                result++;
                window.localStorage[LOCAL_STORAGE_VIEW] = result;
            } catch (ex) {

            }
        },

        getViewCount: function () {
            var result;
            try {
                result = Number(window.localStorage[LOCAL_STORAGE_VIEW]);
            } catch (ex) {
            }

            return result || 0;
        },
        
        shouldShow: function () {
            return this.getViewCount() > 1 &&
                   this.isMobileSafari() &&
                   !this.hasBeenDismissedTooManyTimes() &&
                   !this.isFullscreen();            
        },
        
        isMobileSafari: function () {            
            return (/iPhone|iPod|iPad/).test(window.navigator.userAgent);            
        },
        
        isIpad: function () {             
            return (/iPad/).test(window.navigator.userAgent);
        },
        
        hasBeenDismissedTooManyTimes: function () {                                    
            try {                                
                return Number((window.localStorage[LOCAL_STORAGE_DISMISSED]) || 0) > 1;                
            } catch (ex) {                
                return true;
            }              
        },
        
        isFullscreen: function () {
            return !!window.navigator.standalone;
        },
        
        createBubble: function () {
            var htmlAsset = app.assets.get(this.html);
            var div = document.createElement('div');
            div.innerHTML = htmlAsset.resource;                                    
            if (this.isIpad()) {
                div.classList.add('ipad');
            }
            
            document.body.appendChild(div);      
                        
            
            this.element = div;
            
            htmlAsset.on('change', function () {
                div.innerHTML = htmlAsset.resource;
            }.bind(this));
            
            var cssAsset = app.assets.get(this.css);
            var css = pc.createStyle(cssAsset.resource);
            document.head.appendChild(css);
            cssAsset.on('change', function () {
               css.innerHTML = cssAsset.resource; 
            }); 
            
            var close = document.getElementById('close');
            if (close) {
                close.addEventListener('click', function () {
                    this.dismiss();
                }.bind(this));
            }
        },
        
        dismiss: function () {
            this.element.parentElement.removeChild(this.element);
            try {
                var val = Number(window.localStorage[LOCAL_STORAGE_DISMISSED] || 0);                
                window.localStorage[LOCAL_STORAGE_DISMISSED] = val + 1;
            } catch (e) {
                
            }
        }
    };

    return Home_screen;
});