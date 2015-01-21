(function() {
  return {
    requesterId: null,
    requesterAddress: null,
    requesterCity: null,
    requesterState: null,
    requesterZip: null,
    requesterCountry: null,
    editableForm: null,
    requester: null,
    userNewParams: null,
    confirmed: true,
    productionOn: null,
    // named events
    events: {
      'app.created':'onAppCreated',

      'ticket.requester.id.changed':'onRequesterChanged',
      'change #package_size': 'onSizeChanged',
      'change .user-info': 'onUserUpdated',
      'change #ship_type': 'onShipSelected',

      'click button.init_new_shipment': 'initNewShipment',
      'click button.init_return_shipment': 'initReturnShipment',
      'click button.init_track_shipment': 'initTrackShipment',
      'click button.init_validate_address': 'initValidateAddress',

      'click .update-decline': 'userUpdateDecline',
      'click .update-user': 'userUpdateConfirm',
      
      'click .create_address': 'onAddressSubmitted',
      'click .create_shipment': 'onShipmentSubmitted',

      'click .select_rate': 'onRateSelected',
      'click .buy_rate': 'buyRate',

      // Zendesk request events
      'fetchUserFromZendesk.done': 'onUserFetched',
      // EasyPost request events
      'verifyAddress.done': 'onVerifyAddressDone',
      'createAddress.done': 'onCreateAddressDone',
      'createShipment.done': 'onCreateShipmentDone',
      'buyRate.done': 'boughtRate'
      
    },
    requests: {
      // easypost requests
      createAddress: function(data) {
        var token = this.token();
        return {
          url: 'https://api.easypost.com/v2/addresses',
          type: 'POST',
          data: data,
          headers: {"Authorization": "Basic " + token}
          // secure: true
        };
      },
      verifyAddress: function(id) {
        var token = this.token();
        return {
          url: 'https://api.easypost.com/v2/addresses/' + id + '/verify',
          headers: {"Authorization": "Basic " + token}
        };
      },
      createShipment: function (data) {
        var token = this.token();
        return {
          url: 'https://api.easypost.com/v2/shipments',
          type: 'POST',
          data: data,
          headers: {"Authorization": "Basic " + token}
          // secure: true
        };
      },
      buyRate: function(rateID, shipmentID) {
        var token = this.token();
        return {
          url: 'https://api.easypost.com/v2/shipments/' + shipmentID + '/buy',
          type: 'POST',
          data: {
            rate: {
              id: rateID
            }
          },
          headers: {"Authorization": "Basic " + token}
        };
      },
      // Zendesk requests
      fetchUserFromZendesk: function () {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', this.ticket().requester().id())
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
          url: helpers.fmt('/api/v2/users/%@.json', this.ticket().requester().id()),
          type: 'PUT',
          contentType: 'application/json',
          data: helpers.fmt( '{ "user": { "user_fields": %@ }}', JSON.stringify(this.userNewParams) )
        };
      },
      updateNameOnly: function (name) {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', this.ticket().requester().id()),
          type: 'PUT',
          contentType: 'application/json',
          data: helpers.fmt('{ "user": { "name": "%@" }}', name )
        };
      }
    },

    onAppCreated: function(app) {
      // TODO disable the tracking field
      var trackingCodeField = this.requirement('tracking_code'),
        trackerField = this.requirement('tracker_id');
      if(this.ticketFields('custom_field_' + trackingCodeField.requirement_id)) {
        this.ticketFields('custom_field_' + trackingCodeField.requirement_id).disable();
      } else {
        // alert the user that the field isn't available?
      }
      if(this.ticketFields('custom_field_' + trackerField.requirement_id)) {
        this.ticketFields('custom_field_' + trackerField.requirement_id).disable();
      } else {
        // alert the user that the field isn't available?
      }
      
      // assign global variables
      if (this.setting('editable_form') === true) {
        this.editableForm = true;
      }
      if (this.setting('production_on') === true) {
        this.productionOn = true;
      }
      this.setUpSizes();
      this.ajax('fetchUserFromZendesk');

      // show home page
      this.switchTo('home');
    },
    initNewShipment: function(e) {
      if(e) {e.preventDefault();}
      this.showShipmentForm();
    },
    initReturnShipment: function(e) {
      if(e) {e.preventDefault();}
      
    },
    initValidateAddress: function(e) {
      if(e) {e.preventDefault();}
      this.showValidateForm();
    },
    initTrackShipment: function(e) {
      if(e) {e.preventDefault();}

    },
    
    showShipmentForm: function(response) {
      var html = this.renderTemplate('_toAddressForm');
      // if no address is supplied just grab the user address from their profile
      this.ajax('fetchUserFromZendesk');
      this.switchTo('shipForm', {
        "show": this.editableForm
      });
      this.$('.to_address_container').html(html);
      this.setUpShipToForm( this.requesterAddress );
      this.setUpShipFromForm();
    },
    showValidateForm: function(response) {
      var html = this.renderTemplate('_toAddressForm');
      if(response) {
        if(!response.message) {
          // TODO ask if Agent wants to update user with validated address
          this.switchTo('validateForm', {
            "message": "Address validated!"
          });
          this.$('.to_address_container').html(html);
        } else {
          this.switchTo('validateForm', {
            "message": response.message
          });
          this.$('.to_address_container').html(html);
        }
        this.setUpShipToForm(response.address); // fills in form with validated address details
      } else {
        // if no address is supplied just grab the user address from their profile
        // this.ajax('fetchUserFromZendesk');
        this.switchTo('validateForm');
        this.$('.to_address_container').html(html);
        this.setUpShipToForm(this.requesterAddress);
      }
    },

    onAddressSubmitted: function(e) { // validate the address
      if (e) { e.preventDefault(); }
      // destination address
      var address = this.toAddress();
      // client-side validation
      if (address.state.length > 2) { services.notify("Please use the 2-letter code for State or Province before submitting"); return;}
      // construct the payload & send to EasyPost
      var data;
      this.ajax('createAddress', {
        "address": address
      });
      this.switchTo('loading');
    },
    onCreateAddressDone: function(response) {
      var addressID = response.id;
      // validate the address w/ EasyPost (by ID)
      this.ajax('verifyAddress', addressID);
    },
    onVerifyAddressDone: function(response) {
      this.showValidateForm(response);
    },
    onShipmentSubmitted: function(e) {
      // when creating a shipment
      if (e) { e.preventDefault(); }
      if (this.userNewParams) { // if the user's info doesn't match what is on their profile ask if the agent wants to update it
        this.showUpdateUserOption();
        this.confirmed = false;
        return false;
      }
      var shipment = {
        "from_address": {},
        "to_address": {},
        "parcel": {}
      };
    // get destination address
      shipment.to_address = this.toAddress();
      // if ( this.$('input[name=zip_code]').val().length > 0 ){
      //   shipment.from_address.zip = this.$('input[name=zip_code]').val().match(/[a-z0-9]/ig).join("");
      // }
    // get origin address
      shipment.from_address = this.fromAddress();
    // get parcel info
      var packageSize = this.$('select#package_size').val();
      var dimensions;
      if (packageSize == 'custom') {
        // get the dimensions from the in=app form
        dimensions = {
          'height': this.$('input[name=height]'),
          'weight': this.$('input[name=weight]'),
          'width': this.$('input[name=width]'),
          'length': this.$('input[name=length')
        };
      } else {
        // get the dimensions for the selected size from Settings
        dimensions = this.sizes[ packageSize ];
      }
      // TODO add options for predefined packages

      // built parcel data for EasyPost
      shipment.parcel = {
        length: dimensions.length,
        height: dimensions.height,
        width:  dimensions.width,
        weight: dimensions.weight
      };
      // validate client-side
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
      this.rates = response.rates;
      this.shipmentID = response.id;
      this.switchTo('rates', {
        "rates":response.rates
      });
    },
    onRateSelected: function(e) {
      e.preventDefault();
      console.log(e.currentTarget.dataset.rateId);
      var rateId = e.currentTarget.dataset.rateId;
      var rate = _.find(this.rates, function(rate) {
        return rateId == rate.id;
      });
      this.switchTo('selectedRate', {
        rate: rate
      });
    },
    buyRate: function(e) {
      e.preventDefault();
      var rateID = e.currentTarget.dataset.rateId;
      this.ajax('buyRate', rateID, this.shipmentID);
    },
    boughtRate: function(response) {
      console.log(response);
      this.updateTicket(response);
      this.switchTo('createdShipment', {
        response: response
      });
    },


    onShipSelected: function(e) { // ??
      if (this.$(e.target).val() == "12") {
        this.$('.valueBox').show();
      } else {
        this.$('.valueBox').hide();
      }
    },

    updateTicket: function(response) {
      var url = response.postage_label.label_url;
      var comment = helpers.fmt("Label URL: %@ [ ![Shipping Label](%@) ](%@)", url, url, url);
      this.ajax('updateTicketComment', comment, response.tracking_code);
    },

    // changed events
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
        // this.currentUserId = this.ticket().requester().id();
        console.log("Fetching new requester info");
        this.ajax('fetchUserFromZendesk');
      }
    },

    // User functions
    onUserFetched: function(data) {
      var user = data.user,
        address = {
          name: user.name
        };
      if (user.user_fields) {
        address.street1 = user.user_fields[this.fmtd(this.setting('user_address_field'))];
        address.city = user.user_fields[this.fmtd(this.setting('user_city_field'))];
        address.state = user.user_fields[this.fmtd(this.setting('user_state_field'))];
        if( user.user_fields[this.fmtd(this.setting('user_country_field'))] ) {
          address.country = user.user_fields[this.fmtd(this.setting('user_country_field'))].substr(0,2);
        }
        if ( user.user_fields[this.fmtd(this.setting('user_zip_field'))] ) {
          address.zip = user.user_fields[this.fmtd(this.setting('user_zip_field'))].match(/[a-z0-9]/ig).join("");
        }
      }
      this.requesterAddress = address;
      this.setUpShipToForm(address);
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
    showUpdateUserOption: function() {
      this.$('.update-confirm').fadeIn();
      this.$('.create').fadeOut();
    },
    userUpdateConfirm: function(e) {
      e.preventDefault();
      this.ajax('updateUser');
      this.endUserUpdatePrompt();
    },
    userUpdateDecline: function(e) {
      e.preventDefault();
      this.endUserUpdatePrompt();
    },
    endUserUpdatePrompt: function() {
      this.$('.update-confirm').fadeOut();
      this.userNewParams = null;
      this.onShipmentSubmitted();
    },
    // token
    token: function() {
      if (this.setting('production_on') === true) {
        return btoa(this.setting('easypost_production_token') + ":");
      } else {
        return btoa(this.setting('easypost_testing_token') + ":");
      }
    },
    // getters
    toAddress: function() {
      return {
        name:     this.$('input[name=name]').val(),
        street1:  this.$('input[name=address]').val(),
        city:     this.$('input[name=city]').val(),
        state:    this.$('input[name=state]').val().toUpperCase(),
        country:  this.$('input[name=country]').val().toUpperCase().substring(0, 2),
        zip:      this.$('input[name=zip_code]').val().match(/[a-z0-9]/ig).join(""),
        email:    this.$('input[name=email]').val()
      };
    },
    fromAddress: function() {
      return {
        name:     this.$('input[name=origin_name]').val() || this.setting('company_name'),
        street1:  this.$('input[name=origin_address]').val() || this.setting('business_address'),
        city:     this.$('input[name=origin_city]').val() || this.setting('city'),
        state:    this.$('input[name=origin_state]').val() || this.setting('state').toUpperCase(),
        country:  this.$('input[name=origin_country]').val() || this.setting('country_code').toUpperCase(),
        zip:      this.$('input[name=origin_zip_code]').val() || this.setting('zip_code'),
        email:    this.$('input[name=origin_email]').val() || this.setting('support_email'),
        phone:    this.$('input[name=origin_phone]').val() || this.setting('phone_number')
      };
    },
    // Setters
    setUpSizes: function(){
      this.sizes = {
        'small': {
          'height': this.setting('small_size_height') || 3,
          'weight': this.setting('small_size_weight') || 5,
          'width': this.setting('small_size_width') || 5,
          'length': this.setting('small_size_length') || 5
        },
        'medium': {
          'height': this.setting('medium_size_height') || 6,
          'weight': this.setting('medium_size_weight') || 7,
          'width': this.setting('medium_size_width') || 7,
          'length': this.setting('medium_size_length' || 7)
        },
        'large': {
          'height': this.setting('large_size_height') || 12,
          'weight': this.setting('large_size_weight') || 14,
          'width': this.setting('large_size_width') || 14,
          'length': this.setting('large_size_length') || 14
        }
      };
    },
    setUpShipToForm: function(address) {
      if(address) {
        // if an address is passed, use that to fill in the destination form
        this.$('input[name=name]').val(address.name);
        this.$('input[name=address]').val(address.street1);
        this.$('input[name=city]').val(address.city);
        this.$('input[name=state]').val(address.state);
        this.$('input[name=zip_code]').val(address.zip);
        this.$('input[name=country]').val(address.country);
      }
    },
    setUpShipFromForm: function() {
      // fill in the origin form (conditionally shown)
      this.$('input[name=origin_name]').val(this.setting("company_name"));
      this.$('input[name=origin_address]').val(this.setting("business_address"));
      this.$('input[name=origin_city]').val(this.setting("city"));
      this.$('input[name=origin_state]').val(this.setting("state"));
      this.$('input[name=origin_zip_code]').val(this.setting("zip_code"));
      this.$('input[name=origin_country]').val(this.setting("country_code"));
      
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
