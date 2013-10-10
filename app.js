// Initialize StackMob
var str = window.location.href;
var prod=str.search("http://pubnubdemo.stackmob339.stackmobapp.com");
var dev=str.search("http://dev.pubnubdemo.stackmob339.stackmobapp.com");

if(prod === 0) {
  StackMob.init({
      publicKey:  "0dbb843a-32bd-4942-b0aa-dedd248c13f1",
      apiVersion: 1
  });
  console.log('init production');
} else if(dev === 0) {
  StackMob.init({
      publicKey: "254649b7-5226-4aab-98b5-8df3157c2976",
      apiVersion: 0
  });
  console.log('init dev');

} else {

  StackMob.init({
      publicKey: "254649b7-5226-4aab-98b5-8df3157c2976",
      apiVersion: 0
  });
}



// Keep app self-contained
var myApp = (function($) {

  // Init
  var pubnub = PUBNUB.init({
      subscribe_key : 'sub-c-10526f7d-2df0-11e2-ad5c-29dc07ffb374'
  });

  function updateDisplay(pubData) {       
    answers = $(pubData.answers).sortAnswers();
    answersAvg = answers.setDataArray();

    var legend = new LegendView({pubnubData: pubData, data : answersAvg}).render().el; 
    $("#legend").html(legend);

    animateData(answersAvg); 
  }

  function animateData(dataArray){
    var angTot = 0,
        angCur = 0; 

    $.each(dataArray, function(key, data) {

        angCur = Math.round(data.value * 36) / 10;

        $('div.' + key + '-2').css('transform', 'rotate(' + angTot + 'deg)');

        // if > 50% we need a second part
        if (data.value > 50){          
            $('div.' + key + '-2 > div').css('transform', 'rotate(' + 180 + 'deg)');
            angTot += 180;
            angCur -= 180;
            
        } else {
            $('div.' + key + '-2 > div').css('transform', 'rotate(0deg)');
        }
        
        $('div.' + key).css('transform', 'rotate(' + angTot + 'deg)');
        $('div.' + key + ' > div').css('transform', 'rotate(' + angCur + 'deg)');
        angTot = Math.round((angTot + angCur) * 10) / 10;
    });
  }

  var Question = StackMob.Model.extend({
      schemaName: 'question'
  });

  var Questions = StackMob.Collection.extend({
      model: Question
  });

  var HomeView = Backbone.View.extend({

    initialize: function() {
      this.collection.bind('change', this.render, this);
      homeTemplate = _.template($('#home').html());
      listTemplate = _.template($('#listTemplate').html());
    },

    render: function(eventName) {
      var collection = this.collection,
        listContainer = $('<ul data-role="listview" id="todoList"></ul>');

      $(this.el).html(homeTemplate());

      var content = $(this.el).find(":jqmData(role='content')");
      content.empty();

      collection.each(function(model) {
        listContainer.append(listTemplate(model.toJSON()));
      });

      content.append(listContainer);

      return this;
    }
  });

  var ButtonView = Backbone.View.extend({
 
    initialize: function() {
      this.model = this.options.model;
      this.template = _.template($('#buttonTemplate').html());
    },

    render: function() { 
      var answers = this.model.toJSON().answers;

      for (var key in answers) {
         var obj = answers[key];
         this.$el.append(this.template(obj));
      }
      return this;
    }
  });

  var LegendView = Backbone.View.extend({
 
    initialize: function() {
      this.model = this.options.model;
      this.data = this.options.data;
      this.pubnubData = this.options.pubnubData;
      this.template = _.template($('#legendTemplate').html());
    },

    render: function() { 
      if(this.pubnubData !== undefined){
        var answers = this.pubnubData.answers;
      } else {
        var answers = this.model.toJSON().answers;
      }
      
      var i = 1;
      for (var key in answers) {
         var obj = answers[key];
         if(this.data["value"+obj.order].value > 0) {
          obj.percent = Math.round(this.data["value"+obj.order].value * 100)/100;  
         } else {
          obj.percent = "0";
         }

         str = obj.title;
         var replaced = str.split('+').join(' ');
         obj.title = replaced;
         this.$el.append(this.template(obj));
         i = i + 1;
      }
      return this;
    }
  });

  

  var PieView = Backbone.View.extend({
    initialize: function() {
      this.data = this.options.data;
      this.template = _.template($('#pieTemplate').html());
      this.template2 = _.template($('#pie2Template').html());
      this.render();
    },

    render: function() { 
      var answers = this.data;

      var $chart = $('#donutchart'),
        $graph = $('#graph'),
        angTot = 0,
        angCur = 0,
        $holder,
        $pie,
        chartWidth = $chart.width(),
        chartHeight = $chart.height();
       
      for (var key in answers) {
        var data = answers[key];
       
        angTot = Math.round((angTot + angCur) * 10) / 10;
        $graph.append(this.template({key : key}));

        $holder = $graph.find('> div:last-child').append('<div><div></div></div>');
        $pie = $graph.find('> div:last-child > div');
        $holder.css('transform', 'rotate(' + (angTot - 1) + 'deg)');
        $pie.css({
              'transform': 'rotate(' + (angCur + 1) + 'deg)',
              'background-color': data.color
        });

        $graph.append(this.template2({key : key}));
        $holder = $graph.find('> div:last-child').append('<div></div>');
        $pie = $graph.find('> div:last-child>div');    
        $holder.css('transform', 'rotate(0deg)');
        $pie.css({
            'transform': 'rotate(0deg)',
            'background-color': data.color
        });
         
      }

      $graph.find('> div').css('clip', 'rect(0px,' + chartWidth + 'px,' + chartHeight + 'px,' + chartWidth / 2 + 'px)');
      $graph.find('> div > div').css('clip', 'rect(0px,' + chartWidth / 2 + 'px,' + chartHeight + 'px,0px)');
      
      // startanimation
      $graph.addClass('graph-startanimation');
      
      return this;
    }
  });

  var UpdateView = Backbone.View.extend({

    events: {
      "click .button": "update"
    },

    initialize: function() {
      this.router = this.options.router;
      this.model = this.options.model;
      this.question_id = this.options.question_id;
      this.collection = this.collection;
      this.template = _.template($('#updateTemplate').html());
      this.data;
    },

    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));

      var buttons = new ButtonView({model: this.model}).render().el; 
      var content = $(this.el).find("#buttons");
      content.append(buttons);

      var answers = $(this.model.toJSON().answers).sortAnswers();
      this.data = answers.setDataArray();
      this.initChart(); 

      var legend = new LegendView({model: this.model, data : this.data}).render().el; 
      var content = $(this.el).find("#legend");
      content.append(legend);
      
      return this;
    },

    initChart: function() {
      var self = this;
      setTimeout(function(){
        pie = new PieView({data: self.data});
        setTimeout(function(){
          animateData(self.data);
        }, 100);
      }, 100);

    },
    update: function(e) {
      e.preventDefault();
      self = this;
      console.log(self.question_id);
      answer_id = $(e.currentTarget).attr('data-id');
      
      StackMob.customcode('pubnub_send', { 
          answer_id: answer_id,
          question_id: self.question_id
          }, "POST", { 
          success: function(result) { 
              //console.debug(result); 
          }, 
          error: function(error) { 
              console.log(error); 
          }
      });
    }
  });

  var AppRouter = Backbone.Router.extend({
    routes: {
      "": "home",
      "update/:id": "update"
    },

    initialize: function(options) {
      // Handle back button throughout the application
      $('.back').on('click', function(event) {
        window.history.back();

        return false;
      });
      this.firstPage = true;
      this.collection = options.collection;
    },

    home: function() {
      this.changePage(new HomeView({
        collection: this.collection
      }), true);
    },

    update: function(e) {
      // LISTEN
      console.log(e);
      pubnub.subscribe({
          channel : e,
          message : function(pubData){  updateDisplay(pubData); }
      });

      question = new Question({question_id : e});
      var q = new StackMob.Collection.Query();
      q.setExpand(1);
      self = this;
      question.query(q,{
        async: false,
        success : function(data){
          self.changePage(new UpdateView({
            collection: self.collection,
            router: this,
            model: data,
            question_id : e
          }), false);
        },
        error : function(error) {
          alert("Error Loading - Did you set your public key?");
        }
      });
    },

    changePage: function(page, reverse) {
      $(page.el).attr('data-role', 'page');
      page.render();
      $('body').append($(page.el));

      var transition = $.mobile.defaultPageTransition;
      // We don't want to slide the first page
      if (this.firstPage) {
        transition = 'none';
        this.firstPage = false;
      }

      $.mobile.changePage($(page.el), {
        changeHash: false,
        transition: transition,
        reverse: reverse
      });
    }
  });

  var initialize = function() {
    questions = new Questions();

    questions.fetch({
      async: false,
      success : function(collection){
        
      },
      error : function(error) {
        alert("Error Loading - Did you set your public key?");
      }
    });

    var app_router = new AppRouter({
      collection: questions
    });
    Backbone.history.start();
  };

  return {
    initialize: initialize
  };

}(jQuery));

// When the DOM is ready
$(document).ready(function() {
  myApp.initialize();
});

$.fn.sortAnswers = function() {
  function compare(a,b) {
    if (a.order < b.order)
       return -1;
    if (a.order > b.order)
      return 1;
    return 0;
  }
  this.sort(compare);

  return this;
};

$.fn.setDataArray = function() {
  var dataArray = new Object();
  for(i = 0; i < this.length; i++) {
      valueObj = new Object();
      valueObj["value"] = parseInt(this[i]["value"]);
      valueObj["color"] = this[i]["color"];
      valueObj["answer_id"] = this[i]["answer_id"]; 
      valueObj["title"] = this[i]["title"];        
      dataArray["value" + (i + 1)] = valueObj;
  }

  sum = 0;
  $.each(dataArray, function(key, data) {
      sum += data.value;                });
  $.each(dataArray, function(key, data) {
      var percent = (100 / sum) * data.value;
      data.value = percent;
  });

  return dataArray;
}
