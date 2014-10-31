(function() {
  var f$ = this.jQuery;
  // dp = new DOMParser();
  // var oSerializer = new XMLSerializer();
  return {
    sizes: {
      'small': {
        'height': '3',
        'weight': '5',
        'width': '5',
        'length': '5'
      },
      'medium': {
        'height': '6',
        'weight': '7',
        'width': '7',
        'length': '7'
      },
      'large': {
        'height': '12',
        'weight': '14',
        'width': '14',
        'length': '14'
      }
    },
    requesterId: null,
    requesterAddress: null,
    requesterCity: null,
    requesterState: null,
    requesterZip: null,
    requesterCountry: null,
    editableForm: null,
    userObj: null,
    userNewParams: null,
    confirmed: true,
    productionOn: null,
    requests: {
      fetchUserFromZendesk: function () {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', this.requesterId)
        };
      },
      requestShipping: function (data) {
        var production;
        if (this.setting('production_on') === true) {
          production = true;
        } else {
          production = false;
        }
        return {
          url: 'https://api.easypost.com/v2/shipments',
          type: 'POST',
          data: data,
          headers: {"Authorization": "Basic " + btoa(this.setting('easypost_testing_token') + ":")}
          // secure: true
        };
      },
      updateTicketComment: function (comment, track) {
        var field = this.setting('tracking_field');
        console.log("Tracking number: " + track);
        return {
          url: helpers.fmt('/api/v2/tickets/%@.json', this.ticket().id()),
          type: 'PUT',
          contentType: 'application/json',
          data: helpers.fmt('{"ticket": {"comment": {"public":false, "body": "%@" }, "custom_fields": [{"id": %@,"value":"%@"}] }}', comment, field, track )
        };
      },
      updateUser: function () {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', this.requesterId),
          type: 'PUT',
          contentType: 'application/json',
          data: helpers.fmt( '{ "user": { "user_fields": %@ }}', JSON.stringify(this.userNewParams) )
        };
    },
    updateNameOnly: function (name) {
      return {
        url: helpers.fmt('/api/v2/users/%@.json', this.requesterId),
        type: 'PUT',
        contentType: 'application/json',
        data: helpers.fmt('{ "user": { "name": "%@" }}', name )
      };
    }
    },
    events: {
      'app.activated':'onAppActivated',
      'change #package_size': 'onSizeChanged',
      'change .user-info': 'onUserUpdated',
      'change #ship_type': 'onShipSelected',
      'click button.initialize': 'showForm',
      'click .update-decline': 'userUpdateDecline',
      'click .update-user': 'userUpdateConfirm',
      'click a.create': 'onFormSubmitted',
      'fetchUserFromZendesk.done': 'onUserFetched',
      'requestShipping.done': 'onRequestShippingDone'
    },
    onAppActivated: function(app) {
      if (this.setting('editable_form') === true) {
        this.editableForm = true;
      }
      if (this.setting('production_on') === true) {
        this.productionOn = true;
      }

      this.requesterId = this.ticket().requester().id();
      this.setUpSizes();
      this.showForm();
    },
    setUpSizes: function(){
      this.sizes = {
        'small': {
          'height': this.setting('small_size_height'),
          'weight': this.setting('small_size_weight'),
          'width': this.setting('small_size_width'),
          'length': this.setting('small_size_length')
        },
        'medium': {
          'height': this.setting('medium_size_height'),
          'weight': this.setting('medium_size_weight'),
          'width': this.setting('medium_size_width'),
          'length': this.setting('medium_size_length')
        },
        'large': {
          'height': this.setting('large_size_height'),
          'weight': this.setting('large_size_weight'),
          'width': this.setting('large_size_width'),
          'length': this.setting('large_size_length')
        }
      };
    },
    showForm: function() {
      this.switchTo('form', {"hide": this.editableForm});
      this.ajax('fetchUserFromZendesk');
      this.setUpShipToForm();
    },
    setUpShipToForm: function() {
      this.$('input[name=shipto_name]').val(this.setting("company_name"));
      this.$('input[name=shipto_address]').val(this.setting("business_address"));
      this.$('input[name=shipto_city]').val(this.setting("city"));
      this.$('input[name=shipto_state]').val(this.setting("state"));
      this.$('input[name=shipto_zip_code]').val(this.setting("zip_code"));
      this.$('input[name=shipto_country]').val(this.setting("country_code"));
    },
    showUpdateUserOption: function() {
      this.$('.update-confirm').fadeIn();
      this.$('.create').fadeOut();
    },
    onRequestShippingDone: function(data) {



    console.log(data);

    // old stuff

     // var xmlResponse = data.documentElement;
     // var comment;
     //  if ( xmlResponse.getElementsByTagName('TrackingNumber').length > 0 ) {
     //    var tracking_number = xmlResponse.getElementsByTagName('TrackingNumber')[0].childNodes[0].nodeValue;
     //    if ( xmlResponse.getElementsByTagName('GraphicImage').length > 0 ){ // what is this for? IF it has the image
     //        var imageData = xmlResponse.getElementsByTagName('GraphicImage')[0].childNodes[0].nodeValue;
     //        comment = "![label_image](data:image;base64," + imageData.replace(' ', '') + ") Tracking Number: " + tracking_number;
     //        if ( this.setting('tracking_field') ) {
     //          console.log("Log: Tracking field enabled.");
     //          // this.ticket().customField("custom_field_" + this.setting('tracking_field'), tracking_number ); //TODO: remove
     //          this.ajax('updateTicketComment', comment, tracking_number);
     //        } else {
     //          this.ajax('updateTicketComment', comment);
     //        }
     //        services.notify('Label has been sent to customer and attached to this ticket. Refresh to see updates to this ticket.');
     //        this.switchTo('button');



     //    } else if ( xmlResponse.getElementsByTagName('LabelURL').length > 0) { // what is this for? IF it has the label URL
     //      var labelUrl = xmlResponse.getElementsByTagName('LabelURL')[0].childNodes[0].nodeValue;
     //      comment = 'UPS temporary Label URL: ' + labelUrl + ' / Tracking Number: ' + tracking_number;
     //      if ( this.setting('tracking_field') ) {
     //        console.log("Log: Tracking field enabled.");
     //        // this.ticket().customField("custom_field_" + this.setting('tracking_field'), tracking_number ); //TODO: remove
     //        this.ajax('updateTicketComment', comment, tracking_number);
     //      } else {
     //        this.ajax('updateTicketComment', comment);
     //      }
     //      services.notify('Label has been sent to customer and attached to this ticket. Refresh to see updates to this ticket.');
     //      this.switchTo('button');



     //    } else {
     //    //if ( xmlResponse.getElementsByTagName('Alert').length > 0 ) {
     //      var lookup = xmlResponse.getElementsByTagName('TrackingNumber')[0].childNodes[0].nodeValue;
     //      this.ajax('updateTicketComment', 'See carrier for more details - Tracking Number: ' + lookup, lookup);
     //      services.notify('Your shipment needs additional preparation. TrackingNumber: ', lookup);
     //    }
     //  }
     //  else if ( xmlResponse.getElementsByTagName('PrimaryErrorCode').length > 0 || xmlResponse.getElementsByTagName('faultstring').length > 0 ) {
     //      var error = xmlResponse.getElementsByTagName('Description')[0].childNodes[0].nodeValue;
     //      services.notify("Shipping error: "+ error + ". Please check your information and try again", "error");
     //      console.log("error:", error);
     //      this.switchTo('button');
     //  }
    },
    onUserFetched: function(data) {
      this.userObj = data.user;
      var user = this.userObj;
      this.$('input[name=name]').val(user.name);
      this.$('input[name=email]').val(user.email);
      if (user.user_fields) {
        this.$('input[name=address]').val(user.user_fields[this.fmtd(this.setting('user_address_field'))]);
        this.$('input[name=city]').val(user.user_fields[this.fmtd(this.setting('user_city_field'))]);
        this.$('input[name=state]').val(user.user_fields[this.fmtd(this.setting('user_state_field'))]);
        if( user.user_fields[this.fmtd(this.setting('user_country_field'))] ) {
          this.$('input[name=country]').val(user.user_fields[this.fmtd(this.setting('user_country_field'))].substr(0,2));
        }
        if ( user.user_fields[this.fmtd(this.setting('user_zip_field'))] ) {
          this.$('input[name=zip_code]').val(user.user_fields[this.fmtd(this.setting('user_zip_field'))].match(/[a-z0-9]/ig).join(""));
        }
      }
    },
    onSizeChanged: function(event) {
      var sizeSelected = this.$(event.target).val();
      if (sizeSelected == 'custom') {
        this.$('.dimensions').show();
      } else {
        this.$('.dimensions').hide();
        this.$('input[name="weight"], input[name="height"], input[name="width"], input[name="length"]').val('');
      }
    },
    onRequesterChanged: function() {
      if (this.ticket().requester() &&
          this.ticket().requester().id()) {
        this.currentUserId = this.ticket().requester().id();
        this.ajax('fetchUserFromZendesk');
      }
    },
    onFormSubmitted: function(e) {
      if (e) { e.preventDefault(); }
      if (this.userNewParams) {
        this.showUpdateUserOption();
        this.confirmed = false;
        return false;
      }
      var shipment = {
        "from_address": {},
        "to_address": {},
        "parcel": {}
      };
      // from address
      shipment.from_address.name = this.$('input[name=name]').val();
      shipment.from_address.street1 = this.$('input[name=address]').val();
      shipment.from_address.city = this.$('input[name=city]').val();
      shipment.from_address.country = this.$('input[name=country]').val().toUpperCase().substring(0, 2);
      shipment.from_address.state = this.$('input[name=state]').val().toUpperCase();
      if ( this.$('input[name=zip_code]').val().length > 0 ){
        shipment.from_address.zip = this.$('input[name=zip_code]').val().match(/[a-z0-9]/ig).join("");
      }
      shipment.from_address.email = this.$('input[name=email]').val();
      // to address
      shipment.to_address.name = this.$('input[name=shipto_name]').val() || this.setting('company_name');
      shipment.to_address.street1 = this.$('input[name=shipto_address]').val() || this.setting('business_address');
      shipment.to_address.city = this.$('input[name=shipto_city]').val() || this.setting('city');
      shipment.to_address.state = this.$('input[name=shipto_state]').val() || this.setting('state').toUpperCase();
      shipment.to_address.country = this.$('input[name=shipto_country]').val() || this.setting('country_code').toUpperCase();
      shipment.to_address.zip = this.$('input[name=shipto_zip_code]').val() || this.setting('zip_code');

      // shipment.psize = this.sizes[this.$('select#package_size').val()];
      var dimensions = this.sizes[this.$('select#package_size').val()];
      // shipment.parcel.length = dimensions.length;
      // shipment.parcel.height = dimensions.height;
      // shipment.parcel.width = dimensions.width;
      shipment.parcel.weight = dimensions.weight;
      shipment.parcel.predefined_package = 'LargeFlatRateBox';

      for (var key in shipment) {
        if (!shipment[key]) {
          services.notify('Please fill in the field for "' + key + '" before continuing.');
          return false;
        }
      }
      if (shipment.from_address.state.length > 2) { services.notify("Please use the 2-letter code for State or Province before submitting"); return;}
      this.switchTo('loading');
      var data = {
        "shipment": shipment
      };
      this.ajax('requestShipping', data);
    },
    onUserUpdated: function(e) {
       var self = this,
          newVal = this.$(e.target).val();
      if (!this.userNewParams) { this.userNewParams = {}; }
      switch( this.$(e.target).attr('name')) {
        case 'name':
          this.ajax('updateNameOnly', newVal );
          break;
        case 'address':
          self.userNewParams[self.fmtd(self.setting('user_address_field'))] = newVal;
          break;
        case 'city':
          self.userNewParams[self.fmtd(self.setting('user_city_field'))] = newVal;
          break;
        case 'state':
          self.userNewParams[self.fmtd(self.setting('user_state_field'))] = newVal;
          break;
        case  'country':
          self.userNewParams[self.fmtd(self.setting('user_country_field'))] = newVal;
          break;
        case 'zip_code':
          self.userNewParams[self.fmtd(self.setting('user_zip_field'))] = newVal;
          break;
      }
    },
    onShipSelected: function(e) {
      if (this.$(e.target).val() == "12") {
        this.$('.valueBox').show();
      } else {
        this.$('.valueBox').hide();
      }
    },
    // TODO: dry up these two
    userUpdateConfirm: function(e) {
      this.ajax('updateUser');
      this.$('#update-confirm').fadeOut();
      this.userNewParams = null;
      this.onFormSubmitted();
      e.preventDefault();
    },
    userUpdateDecline: function(e) {
      this.$('.update-confirm').fadeOut();
      this.userNewParams = null;
      this.onFormSubmitted();
      e.preventDefault();
    },
  // --------- UTILITY FUNCTIONS --------- //
    fmtd: function(str) {
      return str.toLowerCase().replace(' ', '_');
    },
    today: function() {
      var date = new Date(), month = date.getMonth() + 1;
      if( month < 10 ){ month = "0" + month;  }
      return "" + date.getFullYear() + month + date.getDate();
    }
  };

}());
