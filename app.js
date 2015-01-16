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
    events: {
      'app.created':'onAppActivated',

      'change #package_size': 'onSizeChanged',
      'change .user-info': 'onUserUpdated',
      'change #ship_type': 'onShipSelected',
      'click button.initialize': 'init',
      'click .update-decline': 'userUpdateDecline',
      'click .update-user': 'userUpdateConfirm',
      'click .create_address': 'onAddressSubmitted',
      'click .create_shipment': 'onShipmentSubmitted',
      // Zendesk requests
      'fetchUserFromZendesk.done': 'onUserFetched',
      // EasyPost Requests
      'verifyAddress.done': 'onVerifyAddressDone',
      'createAddress.done': 'onCreateAddressDone',
      'createShipment.done': 'onCreateShipmentDone',
      
    },
    requests: {
      fetchUserFromZendesk: function () {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', this.requesterId)
        };
      },
      // easypost requests
      createAddress: function(data) {
        var token;
        if (this.setting('production_on') === true) {
          token = btoa(this.setting('easypost_production_token') + ":");
        } else {
          token = btoa(this.setting('easypost_testing_token') + ":");
        }
        return {
          url: 'https://api.easypost.com/v2/addresses',
          type: 'POST',
          data: data,
          headers: {"Authorization": "Basic " + token}
          // secure: true
        };
      },
      verifyAddress: function(id) {
        var token;
        if (this.setting('production_on') === true) {
          token = btoa(this.setting('easypost_production_token') + ":");
        } else {
          token = btoa(this.setting('easypost_testing_token') + ":");
        }
        return {
          url: 'https://api.easypost.com/v2/addresses/' + id + '/verify',
          headers: {"Authorization": "Basic " + token}
        };
      },

      createShipment: function (data) {
        var token;
        if (this.setting('production_on') === true) {
          token = btoa(this.setting('easypost_production_token') + ":");
        } else {
          token = btoa(this.setting('easypost_testing_token') + ":");
        }
        return {
          url: 'https://api.easypost.com/v2/shipments',
          type: 'POST',
          data: data,
          headers: {"Authorization": "Basic " + btoa(this.setting('easypost_testing_token') + ":")}
          // secure: true
        };
      },
      

      // Zendesk requests
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
    init: function(e) {
      if(e) {e.preventDefault();}
      this.showForm();
    },
    showForm: function(response) {
      if(response) {
        if(!response.message) {
          // TODO ask if Agent wants to update user with validated address
          this.switchTo('form', {
            "show": this.editableForm,
            "message": "Address validated!"
          });
          this.$('.create_address').hide();
        } else {
          this.switchTo('form', {
            "show": this.editableForm,
            "message": response.message
          });
          this.$('.create_shipment').prop('disabled', true);
        }
        this.setUpShipToForm(response.address);
      } else {
        this.ajax('fetchUserFromZendesk');
        this.switchTo('form', {
          "show": this.editableForm
        });
        this.setUpShipToForm();
      }
      
    },
    setUpShipToForm: function(address) {
      if(address) {
        this.$('input[name=name]').val(address.name);
        this.$('input[name=address]').val(address.street1);
        this.$('input[name=city]').val(address.city);
        this.$('input[name=state]').val(address.state);
        this.$('input[name=zip_code]').val(address.zip);
        this.$('input[name=country]').val(address.country);
      }
      this.$('input[name=origin_name]').val(this.setting("company_name"));
      this.$('input[name=origin_address]').val(this.setting("business_address"));
      this.$('input[name=origin_city]').val(this.setting("city"));
      this.$('input[name=origin_state]').val(this.setting("state"));
      this.$('input[name=origin_zip_code]').val(this.setting("zip_code"));
      this.$('input[name=origin_country]').val(this.setting("country_code"));
      
    },
    onAddressSubmitted: function(e) {
      if (e) { e.preventDefault(); }
      // if (this.userNewParams) {
      //   this.showUpdateUserOption();
      //   this.confirmed = false;
      //   return false;
      // }
      var address = {};
      // to address
      address.name = this.$('input[name=name]').val() || this.setting('company_name');
      address.street1 = this.$('input[name=address]').val() || this.setting('business_address');
      address.city = this.$('input[name=city]').val() || this.setting('city');
      address.state = this.$('input[name=state]').val() || this.setting('state').toUpperCase();
      address.country = this.$('input[name=country]').val() || this.setting('country_code').toUpperCase();
      address.zip = this.$('input[name=zip_code]').val() || this.setting('zip_code');

      for (var key in address) {
        if (!address[key]) {
          services.notify('Please fill in the field for "' + key + '" before continuing.');
          return false;
        }
      }
      if (address.state.length > 2) { services.notify("Please use the 2-letter code for State or Province before submitting"); return;}
      this.switchTo('loading');
      var data = {
        "address": address
      };
      this.ajax('createAddress', data);
    },
    onCreateAddressDone: function(response) {
      var addressID = response.id;
      this.ajax('verifyAddress', addressID);
      // console.log(response);
      // this.switchTo('button');
    },
    onVerifyAddressDone: function(response) {
      this.showForm(response);
    },
    onShipmentSubmitted: function(e) {
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
      shipment.to_address.name = this.$('input[name=origin_name]').val() || this.setting('company_name');
      shipment.to_address.street1 = this.$('input[name=origin_address]').val() || this.setting('business_address');
      shipment.to_address.city = this.$('input[name=origin_city]').val() || this.setting('city');
      shipment.to_address.state = this.$('input[name=origin_state]').val() || this.setting('state').toUpperCase();
      shipment.to_address.country = this.$('input[name=origin_country]').val() || this.setting('country_code').toUpperCase();
      shipment.to_address.zip = this.$('input[name=origin_zip_code]').val() || this.setting('zip_code');

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
      this.ajax('createShipment', data);
    },
    onCreateShipmentDone: function(response) {
      console.log(response.rates);
      this.switchTo('rates', {
        "rates":response.rates
      });
    },
    onShipSelected: function(e) {
      if (this.$(e.target).val() == "12") {
        this.$('.valueBox').show();
      } else {
        this.$('.valueBox').hide();
      }
    },


    showUpdateUserOption: function() {
      this.$('.update-confirm').fadeIn();
      this.$('.create').fadeOut();
    },
    onUserFetched: function(data) {
      this.userObj = data.user;
      var user = this.userObj;
      this.$('input[name=name]').val(user.name);
      // this.$('input[name=email]').val(user.email);
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

    // User updates
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
      // TODO: dry up these two
    userUpdateConfirm: function(e) {
      this.ajax('updateUser');
      this.$('#update-confirm').fadeOut();
      this.userNewParams = null;
      this.onShipmentSubmitted();
      e.preventDefault();
    },
    userUpdateDecline: function(e) {
      this.$('.update-confirm').fadeOut();
      this.userNewParams = null;
      this.onShipmentSubmitted();
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
