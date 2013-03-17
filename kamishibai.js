(function(){
this.Kamishibai = function Kamishibai($this,options) {
  this.options = options;
  this.$element = $this;
  
  var $screen = $('<div id="_pic_screen" />' );
  var $contentArea = $('<div id="_pic_content_area" />' );
  $screen.appendTo("body");
  $contentArea.addClass("ps-content").appendTo($screen);

  var $contents = this.$contents = $this.children().clone().addClass("ps-scene").hide();
  $contentArea.append( $contents ); 
  var width   = 640;
  var height  = 400; 
  this.defaultWait = options.defaultWait || 160;
  this.currentScene = 0;
  this.defaultEffect = options.defaultEffect || 'fadeIn';
  this.defaultWaitAfter = options.defaultWaitAfter || 0;

  $screen.addClass( "ps-screen" );  
  $screen.css({
    background: "#000",
    width: "" + width + "px",
    height: "" + height + "px",
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: "-" + (width/2) + "px",
    marginTop: "-" + (height/2) + "px"
  });
  this.start();
};

Kamishibai.prototype = {
  start: function() {
    //console.log( "pictureStory: start" );
    var me = this;
    var $currentContent;
    var doNext = function() {
      me.currentScene += 1;
      if( me.currentScene < me.$contents.length ) {
        callback();
      }
    };
    var callback = function() {
      console.log( "currentScene: " + me.currentScene );
      me.$contents.hide();
      $currentContent = me.$contents.eq( me.currentScene )

      var effectType = $currentContent.attr("data-effect") || me.defaultEffect;
      var effectorClass = Kamishibai.effectors[effectType] || FadeInEffector;
      var effector = new effectorClass( $currentContent, me, doNext );
      effector.run();
    };
    callback();
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
  _str2span: function(str) {
    return str.replace( /./g, function( str ) {
       return "<c>" + str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + "</c>";
     } );
  },
  replaceTextToTag: function() {
     var s = this.$content.html();
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
     //console.log( "html: " + html );
     this.$content.html(html);
  },
  getSeparateChars: function() {
    this.replaceTextToTag();
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
        $c.show();
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
    $chars.hide();
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
