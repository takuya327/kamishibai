(function(){
this.Kamishibai = function Kamishibai($this,options) {
  this.options = options;
  this.$element = $this;
  
  this.defaultWait = options.defaultWait || 160;
  this.currentScene = 0;
  this.defaultEffect = options.defaultEffect || 'fadeIn';
  this.defaultWaitAfter = options.defaultWaitAfter || 0;
  this.buildScreen();
  this.start();
};

Kamishibai.prototype = {
  buildScreen: function() {
    var options = this.options;
    var $screen = $('<div id="_kamishibai_screen" />' );
    $screen.appendTo("body");
    this.$screen = $screen;
     
    this.buildContent();
    this.buildControl();
  
    var width   = options.width || 640;
    var height  = options.height || 400; 
    var position = options.position || 'fixed';

    $screen.addClass( "ps-screen" );  
    $screen.css({
      background: "#000",
      width: "" + width + "px",
      height: "" + height + "px",
      position: position,
      top: "50%",
      left: "50%",
      marginLeft: "-" + (width/2) + "px",
      marginTop: "-" + (height/2) + "px"
    });
  },
  buildContent: function() {
    var $this = this.$element;
    var $screen = this.$screen;
    var $contentArea = $('<div id="_kamishibai_content_area" />' );
    $contentArea.addClass("ps-content").appendTo($screen);
    var $contents = this.$contents = $this.children().clone().addClass("ps-scene").hide();
    $contentArea.append( $contents ); 
    this.convertContents();
  },
  convertContents: function() {
    var $contents = this.$contents;
    var len = $contents.length;
    for( var i = 0; i < len; i++ ) {
      var $content = $contents.eq(i);
      this._replaceTextToTag( $content );
    }
  },
   _str2span: function(str) {
    return str.replace( /./g, function( str ) {
       return "<c>" + str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + "</c>";
     } );
  },
  _replaceTextToTag: function($content) {
     var s = $content.html();
     var m;
     var pat = /<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/;
     var ret = [];
     while( s && (m = s.match( pat ) ) ) {
       s = RegExp.rightContext;
       ret.push( this._str2span( RegExp.leftContext ) );
       ret.push( m[0] );
     };
     if( s ) {
       ret.push( this._str2span( s ) );
     }
     var html = ret.join('');
     $content.html(html);
  },
  buildControl: function() {
    var me = this;
    var $screen = this.$screen;
    var $controlArea = $('<div id="_kamishibai_control_area" />' );
    $controlArea.addClass("ps-control").appendTo($screen);
    this.$controlArea = $controlArea;
    this.buildControlPrev();
    this.buildControlNext();
  },
  buildControlPrev: function() {
    var me = this;
    this.$prevLink = $('<a href="#" ref="prev" />');
    this.$prevLink.appendTo( this.$controlArea ).click( function() {
      me.prev(true);
      return false;
    } );
  },
  buildControlNext: function() {
    var me = this;
    this.$nextLink = $('<a href="#" ref="next" />');
    this.$nextLink.appendTo( this.$controlArea ).click( function() {
      me.next(true);
      return false;
    } );
  },
  prev: function(stop) {
    if(stop) { this.stop(); }
    if(this.currentScene > 0) {
      this.currentScene -= 1;
      this.showCurrentScene();
    }
  },
  next: function(stop) {
    if(stop) { this.stop(); }
    if(this.currentScene < this.$contents.length - 1) {
      this.currentScene += 1;
      this.showCurrentScene();
    }
  },
  stop: function() {
    if( this.currentEffector ) {
      this.currentEffector.stop();
    }
  },
  showCurrentScene: function() {
    var me = this;
    this.$contents.hide();
    this.$currentContent = this.$contents.eq( this.currentScene );

    var effectType = this.$currentContent.attr("data-effect") || this.defaultEffect;
    var effectorClass = Kamishibai.effectors[effectType] || FadeInEffector;
    var effector = new effectorClass( this.$currentContent, this, function(){
      me.next(); 
    });
    this.currentEffector = effector;
    effector.run();
  }, 
  first: function() {
    this.currentScene = 0;
    this.showCurrentScene();
  },
  start: function() {
    this.first();
  }
};

Kamishibai.Effector = function( $content, parent, doEnd ) {
  this.$content = $content;
  this.parent = parent;
  this._doEnd = doEnd;
};

var camelize = function (str) {
  return str.charAt(0).toUpperCase() + str.substring(1).replace(/-+(.)?/g, function(match, chr) {
    return chr ? chr.toUpperCase() : '';
  });;
};

Kamishibai.Effector.prototype = {
  run: function(){},
  doEnd: function() { this._doEnd(); },
  stop: function() { 
    this.$content.stop(true,true);
    this.clearTimeout();
  },
  setMiddle: function() {
    var h = this.$content.height();
    this.$content.css({ marginTop: "-" + (h/2) + "px" });
  },
  getIntData: function(key) {
    var v;
    var d = ( v = this.$content.attr( "data-" + key ) )
        ? parseInt( v, 10 ) : this.parent["default" + camelize(key)];
    return d;
  },
  getWaitAfter: function() {
    return this.getIntData( "wait-after" );
  },
  getWait: function($currentContent) {
    return this.getIntData( "wait" );
  },
  getDuration: function($currentContent) {
    var duration = this.getIntData(  "duration" ) || 0;
    
    if( duration == 0) {
      var text =  this.$content.text();
      var wait = this.getWait();
      duration = text.length * wait;
    }
    return duration;
  },
  getSeparateChars: function() {
    return this.$content.find("c");
  },
  setTimeout: function( callback, timeout ) {
     this.clearTimeout();
     var me = this;
     if ( timeout && timeout > 0 ) {
       this._timer = window.setTimeout( function() {
         callback.call( me );
       }, timeout );
     } else {
       callback.call( me );
     }
  },
  clearTimeout: function() {
    if( this._timer ) { window.clearTimeout( this._timer ); }
    this._timer = null;
  }
};

Kamishibai.Effector.create = function( definition, superclass ) {
  if( !superclass ) { superclass = Kamishibai.Effector };
  var methods = {};
  var properties = {};
  var Constructor = function() {
    if (this instanceof Constructor) {
      Constructor.prototype.initialize.apply(this, arguments);
    } else {
      return new Constructor();
    }
  };
  
  if( typeof(definition) === "function" ) {
    methods = {
      run: definition
    };
  } else {
    for( var prop in definition ) {
      if( definition.hasOwnProperty(prop) ) {
        var v = definition[prop];
        if( typeof(v) === "function" ) {
          methods[prop] = v;
        } else {
          properties[prop] = v;
        }
      }
    }
  }
  
  Constructor.prototype = Object.create(superclass.prototype, properties);
  Constructor.prototype.constructor = Constructor;
  Constructor.baseConstructor = superclass;
  if (Constructor.prototype.initialize == null) {
    Constructor.prototype.initialize = function() {
      superclass.apply(this, arguments);
    };
  }
  for( var n in methods ) {
    Constructor.prototype[n] = methods[n];
  }
  return Constructor;
};

var FadeInEffector = Kamishibai.Effector.create( function() {
 var me = this;
 var duration = this.getDuration();
 this.$content.css( { opacity: 0 }).show(); 
 this.setMiddle();
 this.$content.animate({opacity: 1}, 600, function() {
   me.setTimeout( function(){ me.doEnd(); }, duration );
 } );  
} );

var TypeWriterEffect = Kamishibai.Effector.create({
  doEnd: function() {
    this.setTimeout( this._doEnd, this.getWaitAfter() );
  },
  run: function() {
    var text = this.$content.text();
    var len = text.length;
    var parentWait = this.getWait();
    var i = 0;
    var me = this;
    var $chars = this.getSeparateChars();
    var dispChar = function() {
      var $c = $chars.eq(i);
      var $parent = $c.closest("[data-wait]", me.$content );
      var wait = $parent.length ? parseInt( $parent.attr("data-wait" ), 10 ) : parentWait;
      
      me.setTimeout( function(){
        $c.css("visibility","visible");
        i += 1;
        if( i < len ) {
          dispChar();
        } else {
          me.doEnd();
        }
      }, wait ); 
    };
    this.$content.show();
    this.setMiddle();
    $chars.css("visibility", "hidden");
    dispChar();
  }
});

Kamishibai.effectors = {
  fadein: FadeInEffector,
  typewriter: TypeWriterEffect
};

$.fn.kamishibai = function(options) {
  if( !options ){ options = {}; } 

  var $this = $(this);
  var obj = $this.data( "pitureStory" );
  if( !obj ) {
    obj = new Kamishibai($this,options);
    $this.data("kamishibai", obj);
  }
  if( typeof(options)=="string" ) {
    obj[options](); 
  }
}; 
}).call(this);
