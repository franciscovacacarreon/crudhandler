/**
 * Constructor de la clase CrudHandler.
 * @param {ApiClient} apiClient - Cliente para realizar solicitudes HTTP.
 * @param {string} entity - Nombre de la entidad con la que se trabajará (por ejemplo, 'usuarios').
 * @param {object} config - Configuración de la clase, incluyendo elementos de la interfaz de usuario.
 */

class CrudHandler {
  constructor(apiClient, entity, config) {
    this.apiClient = apiClient;
    this.entity = entity;
    this.config = config;
    this.dataClient = {};
    this.dataIndex = [];
    this.dataDelete = [];
    this.dataSecondary = {};
    this.dataCart = [];

    this.init();
  }

  /*
   * Inicializa la configuración y carga inicial de datos.
   */
  async init() {
    try {
      this.initTable();
      this.initEventHandlers();
      await this.loadDataIndex();
      await this.loadEntitySecondaries();
      if (this.config.tableDeletes != undefined) {
        this.loadDataDelete();
      }
      if (this.config.newPageEdit) {
        this.loadTableSecondaryEdit();
        this.loadInputsEdit();
      }
      if (this.config.labelEdit == undefined) {
        this.config.labelEdit = "-edit";
      }
      if (this.config.newPageEdit) {
        this.previewImage(this.dataIndex);
      }
    } catch (error) {
      console.log("Error in init", error);
    }
  }

  /*
   * Inicializa la tabla principal y la tabla de elementos eliminados.
   */
  initTable() {
    try {
      this.config.table.bootstrapTable();
      this.config.tableDeletes.bootstrapTable();
    } catch (error) {}
  }

  /*
   * Muestra el modal en la interfaz de usuario.
   */
  showModal() {
    this.config.modal.modal("show");
  }

  /*
   * Oculta el modal en la interfaz de usuario.
   */
  hideModal() {
    this.config.modal.modal("hide");
  }

  /*
   * Inicializa los manejadores de eventos para los botones y elementos de la interfaz de usuario.
   */
  initEventHandlers() {
    $(this.config.saveBtn).on("click", () => {
      this.postInsertEnd();
    });

    $(this.config.updateBtn).on("click", () => {
      if (this.validateInsert(this.config.labelEdit)) {
        this.postInsertEndEdit();
      }
    });

    //v2
    $(this.config.showModalTempBtn).on("click", () => {
      this.config.modalTemp.modal("show");
    });

    $(this.config.addProductBtn).on("click", () => {
      this.addProductTemp();
    });

    $(this.config.saveTempBtn).on("click", () => {
      this.saveCart();
    });

    $(this.config.updateTempBtn).on("click", () => {
      this.updateCart();
    });

    this.eventDocumentReady(this.config.showModalEditBtn, "loadDataEdit");
    this.eventDocumentReady(this.config.showDeleteAlertBtn, "deleteClient");
    this.eventDocumentReady(this.config.showRestoreAlertBtn, "restoreClient");
    this.eventDocumentReady(this.config.removeIdsBtn, "deleteClientIds");
    this.eventDocumentReady(this.config.restoreIdsBtn, "restoreClientIds");

    //v2
    this.eventDocumentReady(this.config.addCartBtn, "addProductTemp");
    this.eventDocumentReady(this.config.deleteCartBtn, "deleteCart");
    this.eventDocumentReady(this.config.inputAmountBtn, "updateAmount");
  }

  eventDocumentReady(button, method) {
    if (button != undefined) {
      $(document).on("click", button, (event) => this[method](event));
    }
  }

  /*
   * Carga los datos iniciales de la tabla principal.
   */
  async loadDataIndex() {
    if (this.entity == null) {
      return;
    }
    try {
      const response = await this.apiClient.get(this.entity);
      this.dataIndex = response.data;
      if (this.config.table != undefined) {
        this.loadTableIndexInit();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /*
   * Carga los datos de la tabla de elementos eliminados.
   */
  async loadDataDelete() {
    try {
      const response = await this.apiClient.get(`${this.entity}/deletes`);
      this.dataDelete = response.data;
      this.loadTableDeleteInit();
    } catch (error) {
      this.handleError(error);
    }
  }

  postInsertEnd() {
    if (this.validateInsert()) {
      if (this.config.contentImage) {
        this.postClientInsert("assembleObjectClientForm", false);
      } else {
        this.postClientInsert();
      }
    }
  }

  postInsertEndEdit() {
    if (this.validateInsert(this.config.labelEdit)) {
      if (this.config.contentImage) {
        this.postClientUpdate(
          "assembleObjectClientForm",
          this.config.labelEdit,
          false
        );
      } else {
        this.postClientUpdate();
      }
    }
  }

  async postClientInsert(
    methodAssemble = "assembleObjectClient",
    isJson = true
  ) {
    try {
      this.config.loader.fadeIn();

      const endpoint =
        this.config.endPointHandler != undefined
          ? this.config.endPointHandler
          : this.entity;
      const dataClientInsert =
        this.config.nameTypeTable == "independent" ||
        this.config.nameTypeTable == "secondary"
          ? this[methodAssemble]()
          : this.dataClient;
      const response = await this.apiClient.post(
        `${endpoint}/store`,
        dataClientInsert,
        isJson
      );

      this.config.loader.fadeOut();

      const dataResponse = await response.json();
      this.handleSuccessfulResponseInsertEnd(
        dataResponse.status,
        dataResponse,
        dataClientInsert
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  handleSuccessfulResponseInsertEnd(
    httpResponse,
    dataResponse,
    dataClientInsert,
    response = null
  ) {
    const dataInsert =
          this.config.contentImage == true
            ? dataResponse.data.inserted_data  //mejorar esta parte de inserted_data
            : dataClientInsert;
    switch (httpResponse) {
      case 201:
        this.handleSuccessfulResponseInsert(response, dataInsert);
        break;
      case 500:
        this.showAlert("error", "Error al insertar el registro.", 1500);
        break;
      case 400:
          this.showAlert("error", "El usuario ya existe.", 1500);
          break;
      default:
        this.handleSuccessfulResponseInsert(response, dataInsert);
        break;
    }
  }

  async postClientUpdate(
    methodAssemble = "assembleObjectClientEdit",
    label = "",
    isJson = true
  ) {
    try {
      this.config.loader.fadeIn();
      const endpoint =
        this.config.endPointHandler != undefined
          ? this.config.endPointHandler
          : this.entity;
      const dataClientInsert =
        this.config.nameTypeTable == "independent" ||
        this.config.nameTypeTable == "secondary"
          ? this[methodAssemble](label)
          : this.dataClient;
      const response = await this.apiClient.post(
        `${endpoint}/update`,
        dataClientInsert,
        isJson
      );
      this.config.loader.fadeOut();

      const dataResponse = await response.json();
      const dataUpdateResponse = dataResponse.data;
      console.log(dataResponse);
      if (dataResponse.status != 200) {
        this.showAlert("error", "Error al actualizar el registro.", 1500);
        return;
      }

      this.actionsAfterUpdate(dataUpdateResponse);
    } catch (error) {
      this.handleError(error);
    }
  }

  async postClientDestroyIds(event = null) {
    try {
      this.config.loader.fadeIn();
      const dataClientDestroy = {
        data: this.getSelectedRows(this.config.table),
      };
      const response = await this.apiClient.post(
        `${this.entity}/destroy/ids`,
        dataClientDestroy
      );
      this.config.loader.fadeOut();

      if (response.status !== 200) {
        this.showAlert("error", "Error al eliminar los registros.", 1500);
        return;
      }

      this.actionsAfterDeleteIds(dataClientDestroy.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async postClientRestoreIds(event = null) {
    try {
      this.config.loader.fadeIn();
      const dataClientRestore = {
        data: this.getSelectedRows(this.config.tableDeletes),
      };
      const response = await this.apiClient.post(
        `${this.entity}/restore/ids`,
        dataClientRestore
      );
      this.config.loader.fadeOut();

      if (response.status !== 200) {
        this.showAlert("error", "Error al restaurar el registro.", 1500);
        return;
      }

      this.actionsAfterRestoreIds(dataClientRestore.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDeleteClient(event) {
    try {
      this.config.loader.fadeIn();
      const id = $(event.target).data("id");
      const response = await this.apiClient.get(`${this.entity}/destroy/${id}`);
      this.config.loader.fadeOut();
      if (response.status == 200) {
        this.handleSuccessfulDelete(response, id);
      } else {
        this.showAlert("error", "Error al eliminar el registro.", 1000);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async getRestoreClient(event) {
    try {
      this.config.loader.fadeIn();
      const id = $(event.target).data("id");
      const response = await this.apiClient.get(`${this.entity}/restore/${id}`);
      this.config.loader.fadeOut();
      if (response.status == 200) {
        this.handleSuccessfulRestore(response, id);
      } else {
        this.showAlert("error", "Error al restaurar el registro.", 1000);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  deleteClient(event) {
    this.showAlertDialog(
      event,
      "getDeleteClient",
      "¿Seguro de eliminar el registro?",
      "Eliminar"
    );
  }

  restoreClient(event) {
    this.showAlertDialog(
      event,
      "getRestoreClient",
      "¿Seguro de restaurar el registro?",
      "Restaurar"
    );
  }

  deleteClientIds(event = null) {
    this.showAlertDialog(
      event,
      "postClientDestroyIds",
      "¿Seguro de eliminar los registros seleccionados?",
      "Eliminar"
    );
  }

  restoreClientIds(event = null) {
    this.showAlertDialog(
      event,
      "postClientRestoreIds",
      "¿Seguro de restaurar los registros seleccionados?",
      "Restaurar"
    );
  }

  actionsAfterUpdate(dataClient) {
    if (this.config.newPageEdit) {
      const labelHref = document.createElement("a");
      let endpoint = this.config.endPointHandler;
      if (endpoint == undefined) {
        endpoint = this.entity;
      }
      this.showAlert("success", "Registro actualizado correctamente.", 1500);
      setTimeout(() => {
        labelHref.href = urlLocal + "/" + endpoint;
        labelHref.click();
      }, 1000);
    } else {
      this.updateObjectEdit(dataClient);
      this.hideModal();
      this.cleanInput();
      this.showAlert("success", "Registro actualizado correctamente.", 1500);
      this.loadTableIndexInit();
    }
  }

  actionsAfterDeleteIds(dataClient) {
    const arrayIds = dataClient.map((objeto) => objeto.id);
    const newDataDelete = this.dataIndex.filter((element) =>
      arrayIds.includes(element.id)
    );
    this.dataDelete = [...this.dataDelete, ...newDataDelete];
    this.dataIndex = this.dataIndex.filter(
      (element) => !arrayIds.includes(element.id)
    );
    this.loadTableIndexInit();
    this.loadTableDeleteInit();
    this.showAlert("success", "Registros eliminados correctamente.", 1500);
  }

  actionsAfterRestoreIds(dataClient) {
    const arrayIds = dataClient.map((objeto) => objeto.id);
    const newDataIndex = this.dataDelete.filter((element) =>
      arrayIds.includes(element.id)
    );
    this.dataIndex = [...this.dataIndex, ...newDataIndex];
    this.dataDelete = this.dataDelete.filter(
      (element) => !arrayIds.includes(element.id)
    );
    this.loadTableIndexInit();
    this.loadTableDeleteInit();
    this.showAlert("success", "Registros restaurados correctamente.", 1500);
  }

  updateObjectEdit(dataClient) {
    let dataEdit = this.dataIndex.find(
      (element) => element.id == dataClient.id
    );
    for (let property in dataEdit) {
      dataEdit[property] = dataClient[property];
    }
    console.log(dataEdit);
    console.log(this.dataIndex);
  }

  loadDataEdit(event) {
    const id = $(event.target).data("id");
    const dataEdit = this.dataIndex.find((element) => element.id == id);
    const selectors = this.config.selectors;
    if (dataEdit != undefined) {
      selectors.forEach((element) => {
        $(`#${element + this.config.labelEdit}`).val(dataEdit[element]);
      });
      this.loadSelectEdit(dataEdit);
      this.previewImage(dataEdit);
      this.showModal();
    }
  }

  assembleObjectClient() {
    const selectors = this.config.selectors;
    const objectClient = {};
    selectors.forEach((element) => {
      const input = $(`#${element}`);
      if (input.is(":checkbox")) {
        objectClient[element] = input.prop('checked') ? 1 : 0;
      } else {
        objectClient[element] = input.val();
      }
      
    });
    if (!this.config.newPageEdit) {
      objectClient.id = this.getNextId();
    }
    return objectClient;
  }

  assembleObjectClientForm(label = "") {
    const selectors = this.config.selectors;
    const formData = new FormData();
    const inputImages = this.config.filesInputImage ?? [];
    inputImages.forEach((element) => {
      const fileInput = document.getElementById(`${element}${label}`);
      formData.append(element, fileInput.files[0]);
    });

    selectors.forEach((element) => {
      formData.append(element, $(`#${element}${label}`).val());
    });

    return formData;
  }

  assembleObjectClientEdit() {
    const selectors = this.config.selectors;
    const objectClient = {};
    selectors.forEach((element) => {
      // objectClient[element] = encodeURIComponent($(`#${element + this.config.labelEdit}`).val());
      objectClient[element] = $(`#${element + this.config.labelEdit}`).val();
    });
    return objectClient;
  }

  getNextId() {
    return this.dataIndex.length > 0
      ? Math.max(...this.dataIndex.map((item) => item.id)) + 1
      : 1;
  }

  loadTableIndex() {
    this.dataIndex.forEach((element) => {
      element.acciones = this.formatActions(element);
    });

    this.dataIndex.sort((elementA, elementB) => elementB.id - elementA.id);
    this.config.table.bootstrapTable("load", this.dataIndex);
  }

  loadTableDelete() {
    this.dataDelete.forEach((element) => {
      element.acciones = this.formatActionsDelete(element);
    });

    this.dataDelete.sort((elementA, elementB) => elementB.id - elementA.id);
    this.config.tableDeletes.bootstrapTable("load", this.dataDelete);
  }

  /**
   * Carga datos secundarios en una tabla, realiza operaciones de formato y manejo de relaciones.
   *
   * @param {Array} data - Los datos a cargar en la tabla secundaria.
   * @param {jQuery} [table] - La tabla Bootstrap a la que se cargarán los datos (opcional).
   * @param {string} [functionActions="formatActions"] - El nombre de la función que realiza acciones específicas en los elementos (opcional).
   * @param {Array} [tableRelation=this.config.tableRelation] - Configuración de las relaciones entre las tablas (opcional).
   * @throws {Error} Lanza un error si ocurre algún problema durante el proceso.
   */
  loadTableSecondary(
    data,
    table = undefined,
    functionActions = "formatActions",
    tableRelation = this.config.tableRelation
  ) {
    try {
      /**
       * Procesa las relaciones para un elemento dado.
       *
       * @param {Object} element - El elemento actual que contiene datos y relaciones.
       * @param {Array} relations - Las relaciones que se deben procesar para el elemento.
       */
      const processRelations = (element, relations) => {
        relations.forEach((relation) => {
          const nameSecondary = relation.nameSecondary;
          const nameIndex = relation.nameIndex ?? [];
          const elementAux = element[nameSecondary];

          nameIndex.forEach((elementNameIndex) => {
            let prefix = relation.prefix ?? nameSecondary;
            prefix = prefix != "" ? prefix + "_" : prefix;

            let substring = "image";
            if (elementNameIndex.includes(substring)) {
              prefix += relation.prefixImage + "_";
            }

            if (elementAux != undefined) {
              element[`${prefix}${elementNameIndex}`] =
                elementAux[elementNameIndex];
            }
          });

          if (relation.with && relation.with.length > 0) {
            processRelations(elementAux, relation.with);
          }

          element.acciones = this[functionActions](element);
          this.loadImageTableIndex(element);

          // Copia propiedades del with al elemento principal
          if (relation.with && relation.with.length > 0) {
            relation.with.forEach((withAttribute) => {
              const attributeName = withAttribute.nameSecondary;
              const nameIndexWith = withAttribute.nameIndex;
              element[attributeName] = elementAux[attributeName];

              nameIndexWith.forEach((nameIndexElement) => {
                let prefixAfter = relation.prefix ?? attributeName;
                prefixAfter =
                  prefixAfter != "" ? prefixAfter + "_" : prefixAfter;
                element[prefixAfter + nameIndexElement] =
                  elementAux[prefixAfter + nameIndexElement];
              });
            });
          }
        });
      };

      const relationsAttributes = tableRelation;
      data.forEach((element) => {
        processRelations(element, relationsAttributes);
      });

      // Ordena los datos en orden descendente por el campo 'id'
      data.sort((elementA, elementB) => elementB.id - elementA.id);

      // Si se proporciona una tabla, carga los datos en ella utilizando BootstrapTable
      if (table != undefined) {
        table.bootstrapTable("load", data);
      }
    } catch (error) {
      console.error("Error en subtable", error);
      throw new Error(
        "Error durante la carga de datos secundarios en la tabla."
      );
    }
  }

  loadTableSecondaryEdit() {
    this.loadTableSecondary([this.dataIndex]);
  }

  loadTableIndexInit() {
    switch (this.config.nameTypeTable) {
      case "independent":
        this.loadTableIndex();
        break;
      case "secondary":
        this.loadTableSecondary(this.dataIndex, this.config.table);
        break;
      default:
        this.loadTableIndex();
        break;
    }
  }

  loadTableDeleteInit() {
    switch (this.config.nameTypeTable) {
      case "independent":
        this.loadTableDelete();
        break;
      case "secondary":
        this.loadTableSecondary(
          this.dataDelete,
          this.config.tableDeletes,
          "formatActionsDelete"
        );
        break;
      default:
        this.loadTableDelete();
        break;
    }
  }

  cleanInput() {
    const selectors = this.config.selectors;
    selectors.forEach((element) => {
      $(`#${element}`).val("");
    });
  }

  /**
   * Maneja la respuesta exitosa después de una operación de inserción.
   * @param {object} response - Respuesta de la solicitud HTTP.
   * @param {object} dataClient - Datos del cliente que se insertaron.
   */
  handleSuccessfulResponse(response, dataClient) {
    this.dataIndex.unshift(dataClient);
    this.cleanInput();
    this.loadTableIndexInit();
    this.showAlert("success", "Registro insertado correctamente.", 1500);
  }

  /**
   * Maneja la respuesta exitosa después de una operación de inserción en la tabla secondaria.
   * @param {object} response - Respuesta de la solicitud HTTP.
   * @param {object} dataClient - Datos del cliente que se insertaron.
   */
  handleSuccessfulResponseSecondary(response, dataClient = {}) {
    this.dataIndex.unshift(dataClient);
    this.cleanInput();
    this.loadTableIndexInit();
    this.showAlert("success", "Registro insertado correctamente.", 1500);

    this.reloadSelect();
  }

  handleSuccessfulResponseInsert(response, dataClient) {
    switch (this.config.nameTypeTable) {
      case "independent":
        this.handleSuccessfulResponse(response, dataClient);
        break;
      case "secondary":
        this.handleSuccessfulResponseSecondary(response, dataClient);
        break;

      default:
        this.handleSuccessfulResponse(response, dataClient);
        break;
    }
    this.reloadImageAfterInsert();
  }
  /**
   * Maneja la respuesta exitosa después de una operación de eliminación.
   * @param {object} response - Respuesta de la solicitud HTTP.
   * @param {number} id - Identificador del registro eliminado.
   */
  handleSuccessfulDelete(response, id) {
    this.showAlert("success", "Registro eliminado correctamente.", 1000);
    const data = response.data;
    const dataInsertDelete = this.dataIndex.find(
      (element) => element.id == data.id
    );
    this.dataIndex = this.dataIndex.filter((element) => element.id != data.id);
    this.dataDelete.unshift(dataInsertDelete);
    this.loadTableIndexInit();
    this.loadTableDeleteInit();
  }

  handleSuccessfulRestore(response, id) {
    this.showAlert("success", "Registro restaurado correctamente.", 1000);
    const data = response.data;
    const dataInsertRestore = this.dataDelete.find(
      (element) => element.id == data.id
    );
    this.dataDelete = this.dataDelete.filter(
      (element) => element.id != data.id
    );
    this.dataIndex.unshift(dataInsertRestore);

    this.loadTableIndexInit();
    this.loadTableDeleteInit();
  }

  handleError(error) {
    console.error(error);

    let errorMessage = "Error en la solicitud, por favor verificar los datos.";
    if (error.name === "NetworkError") {
      errorMessage =
        "Error de red. Por favor, comprueba tu conexión a internet.";
    } else if (error.name === "RequestAbortedError") {
      errorMessage = "La solicitud fue cancelada.";
    }

    this.showAlert("error", errorMessage, 2000);
    this.config.loader.fadeOut();
  }

  /**
   * Muestra una alerta utilizando la biblioteca Swal.
   * @param {string} icon - Icono de la alerta (por ejemplo, 'success', 'error').
   * @param {string} title - Título de la alerta.
   * @param {number} time - Tiempo de visualización de la alerta en milisegundos.
   */
  showAlert(icon, title, time, position = "center") {
    Swal.fire({
      position: position,
      icon: icon,
      title: title,
      showConfirmButton: false,
      timer: time,
    });
  }

  /**
   * Muestra un diálogo de confirmación utilizando la biblioteca Swal.
   * @param {object} event - Evento que desencadenó la acción.
   * @param {string} callback - Nombre del método a llamar si se confirma la acción.
   * @param {string} title - Título del diálogo.
   * @param {string} buttonText - Texto del botón de confirmación.
   */
  showAlertDialog(event, callback, title, buttonText) {
    Swal.fire({
      title: title,
      showDenyButton: true,
      showCancelButton: true,
      showConfirmButton: false,
      denyButtonText: buttonText,
    }).then((result) => {
      if (result.isDenied) {
        this[callback](event);
      }
    });
  }

  /**
   * Valida la inserción de datos antes de realizar la operación.
   * @param {string} labels - Etiquetas adicionales para los selectores (por ejemplo, '-edit').
   * @returns {boolean} - Indica si la validación fue exitosa.
   */
  validateInsert(labels = "") {
    const selectors = this.config.selectorsNotNull;
    for (const element of selectors) {
      const input = $(`#${element}${labels}`);
      if (!this.validation(input)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Realiza la validación de un campo de entrada.
   * @param {object} input - Elemento de entrada jQuery.
   * @returns {boolean} - Indica si la validación fue exitosa.
   */
  validation(input) {
    let resultado = true;
    if (input.val() == "") {
      input.addClass("invalid");
      resultado = false;
    } else {
      input.removeClass("invalid");
    }
    return resultado;
  }

  /**
   * Escapa los valores de un objeto para evitar problemas de codificación en las solicitudes HTTP.
   * @param {object} obj - Objeto con valores a escapar.
   * @returns {object} - Objeto con valores escapados.
   */
  escapeObjectValues(obj) {
    const escapeObject = {};
    for (const propery in obj) {
      if (obj.hasOwnProperty(propery)) {
        escapeObject[propery] = encodeURIComponent(obj[propery]);
      }
    }
    return escapeObject;
  }

  /**
   * Obtiene las filas seleccionadas de una tabla dada.
   * @param {object} table - Elemento de tabla BootstrapTable.
   * @returns {array} - Arreglo de filas seleccionadas.
   */
  getSelectedRows(table) {
    const seletedRows = table.bootstrapTable("getSelections");
    return seletedRows;
  }

  /*
   * Carga las tablas secundarias para la relación uno a muchos
   */
  async loadEntitySecondaries() {
    if (this.config.nameTypeTable == "independent") {
      return;
    }
    try {
      const relations = this.config.tableRelation;
      // this.config.loader.fadeIn();
      relations.forEach((element) => {
        const entity =
          element.entityRest != undefined
            ? element.entityRest
            : element.nameSecondary;
        this.apiClient
          .get(`${entity}`)
          .then((response) => {
            const foreignKey = element.foreignKey;
            const idForeign = this.dataIndex[foreignKey];
            this.dataSecondary[element.nameSecondary] = response.data;
            this.loadSelect(element.select, response.data, idForeign);
            this.loadTableCart(response.data);
            this.config.loader.fadeOut();
          })
          .catch((error) => {
            this.config.loader.fadeOut();
            console.error(error);
          });
      });
    } catch (error) {
      this.config.loader.fadeOut();
      this.handleError(error);
    }
  }

  /**
   * Carga el select2 con los valores de la tabla secundaria.
   * @param {jQuery} select - Elemento de select2.
   * @param {array} array - Arreglo de datos para cargar en el select.
   */
  loadSelect(selectId, array, id = -1) {
    const select = $(selectId);
    if (select.is("select") && this.config.nameTypeTable == "secondary") {
      select.empty();
      select.select2({ width: "100%" });
      const option = `<option value = "${0}">Seleccione una opción</option>`;
      select.append(option);

      array.forEach((element) => {
        let selected = "";
        if (element.id == id) {
          selected = "selected";
        }
        const option = `<option value = "${element.id}" ${selected}>${element.id} - ${element.name}</option>`;
        select.append(option);
      });
      select.trigger("change");
    }
  }

  loadSelectEdit(dataEdit = null) {
    if (this.config.nameTypeTable == "secondary") {
      const tableRelation = this.config.tableRelation;
      tableRelation.forEach((element) => {
        this.loadSelect(
          `${element.select + this.config.labelEdit}`,
          this.dataSecondary[element.nameSecondary],
          dataEdit[element.foreignKey]
        );
      });
    }
  }

  loadImageTableIndex(element) {
    if (this.config.contentImage) {
      const imagesInput = this.config.filesInputImage ?? [];
      let imageCount = 0;
      let content = `
      <div class="d-flex justify-content-center align-items-center" id="container-img">`;
      for (const nameInput of imagesInput) {
        content += `
                <figure class="mx-1" style="width: 100px; height: 80px;">
                    <img class="w-100 h-100" src="${urlLocal}/assets/images/${element[nameInput]}" 
                         onerror="this.src='${urlLocal}/assets/images/does_not_exist.avif'" />
                </figure>
                `;

        imageCount++;
        if (imageCount == 3) {
          break;
        }
      }
      content += `</div>`;
      element.image_index = content;
    }
  }

  reloadImageAfterInsert(label = "") {
    if (this.config.contentImage) {
      const filesInput = this.config.filesInputImage ?? [];
      filesInput.forEach((element) => {
        const dropifyInstance = $(`#${element}${label}`).data("dropify");
        dropifyInstance.clearElement();
      });
    }
  }

  previewImage(data) {
    if (this.config.contentImage) {
      this.reloadImageAfterInsert(this.config.labelEdit);
      const filesInput = this.config.filesInputImage ?? [];
      filesInput.forEach((element) => {
        const dropifyInstance = $(`#${element + this.config.labelEdit}`).data(
          "dropify"
        );
        let imageUrl = data[element];
        imageUrl = `${urlLocal}/assets/images/${imageUrl}`;
        dropifyInstance.setPreview(true, imageUrl);
      });
    }
  }

  /**
   * Recarga los valores del select2 después de una operación.
   */
  reloadSelect() {
    const relations = this.config.tableRelation;
    relations.forEach((element) => {
      const relationArrayData = this.dataSecondary[element.nameSecondary];
      this.loadSelect(element.select, relationArrayData);
    });
  }

  loadInputsEdit() {
    const selectors = this.config.selectors;
    const data = this.dataIndex ?? [];
    selectors.forEach((element) => {
      $(`#${element}`).val(data[element]);
    });
    if (this.config.hasMany == undefined) {
      return;
    }
    if (!this.config.hasMany) {
      return;
    }
    const relation = this.config.tableRelation[0];
    const dataMany = this.dataIndex[relation.nameSecondary];
    this.dataCart = dataMany.map((element) => element[relation.manyName]);
  }

  formatActions = (element) => {
    return `
            <button type="button" data-id="${element.id}" class="btn btn-sm edit" title="Editar">
                    <i data-id="${element.id}" class="fa fa-edit"></i>
            </button>
            <button type="button" data-id="${element.id}" class="btn btn-sm delete" title="Borrar">
                <i data-id="${element.id}" class="fa fa-trash text-danger"></i>
            </button>
          `;
  };

  formatActionsDelete = (element) => {
    return `
          <button type="button" data-id="${element.id}" class="btn btn-sm text-info restore" title="Restaurar">
                  <i data-id="${element.id}" class="fa fa-undo"></i>
          </button>
        `;
  };

  detailFormatterOne(index, row) {
    const contentDetail = this.config.contentDetailFormatter;
    const nameAttributeDetail = contentDetail.nameAttributeDetail;
    const headers = contentDetail.configTableDetail.headers;
    const images = contentDetail.images;

    // Crear elementos HTML de manera programática
    const detailContainer = document.createElement("div");
    detailContainer.classList.add("table-detail");

    const heading = document.createElement("h5");
    heading.classList.add("detail-heading");
    heading.textContent =
      this.config.contentDetailFormatter.configTableDetail.headTitle;

    const table = document.createElement("table");
    table.classList.add("table", "table-bordered", "detail-table");

    const thead = document.createElement("thead");
    thead.classList.add("thead-light");

    const headerRow = document.createElement("tr");
    headers.forEach((element) => {
      const th = document.createElement("th");
      th.textContent = element;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const dataRow = document.createElement("tr");

    const valueRowDetail = row[nameAttributeDetail];
    contentDetail.attributes.forEach((element) => {
      const td = document.createElement("td");
      td.textContent = valueRowDetail[element];
      dataRow.appendChild(td);
    });

    const imgContainer = document.createElement("td");
    imgContainer.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" id="container-img">
        ${images
          .map(
            (element) => `
          <figure class="mx-1" style="width: 100px; height: 80px;">
            <img class="w-100 h-100" src="${urlLocal}/assets/images/${valueRowDetail[element]}" />
          </figure>
        `
          )
          .join("")}
      </div>
    `;
    dataRow.appendChild(imgContainer);

    tbody.appendChild(dataRow);
    table.appendChild(tbody);

    // Agregar elementos al contenedor principal
    detailContainer.appendChild(heading);
    detailContainer.appendChild(table);

    return detailContainer;
  }

  //V2

  loadTableCart(data) {
    if (this.config.tableCartRelation == undefined) {
      return;
    }
    this.loadFormatActionsCart(data);
    const table = this.config.tableCartRelation;
    table.bootstrapTable();
    table.bootstrapTable("load", data);
    this.loadTableTemp();
  }

  loadTableTemp(data = null) {
    if (this.config.tableCartTemp == undefined) {
      return;
    }
    this.loadFormatActionsCart(this.dataCart, "temporal");
    const table = this.config.tableCartTemp;
    table.bootstrapTable();
    table.bootstrapTable("load", this.dataCart);
  }

  loadFormatActionsCart(data, functionAction = "relation") {
    switch (functionAction) {
      case "relation":
        data.forEach((element) => {
          element.acciones = this.config.formatActionsRelation(element);
        });
        break;
      case "temporal":
        data.forEach((element) => {
          element.acciones = this.config.formatActionsTemp(element).acciones;
        });
        break;
      default:
        data.forEach((element) => {
          element.acciones = this.config.formatActionsTemp(element).acciones;
        });
        break;
    }
  }

  findCartItemById = (id) => {
    return this.dataCart.find((element) => element.id == id);
  };

  incrementCartItemAmount = (cartItem) => {
    cartItem.amount++;
    this.addFormatActionsTemp(this.dataCart);
  };

  addNewCartItem = (id) => {
    const dataNameRelation = this.config.tableRelation[0].nameSecondary;
    const data = this.dataSecondary[dataNameRelation];
    const dataAdd = data.find((element) => element.id == id);

    if (dataAdd) {
      dataAdd.amount = 1;
      this.dataCart.push(dataAdd);
      this.addFormatActionsTemp(this.dataCart);
    }
  };

  addProductTemp = (event = null) => {
    let id = 0;
    if (event == null) {
      const selectLabel = this.config.tableRelation[0].select;
      id = $(selectLabel).val();
    } else {
      const button = $(event.target);
      id = button.data("id");
    }
    if (id == 0) {
      this.showAlert("info", "Debe seleccionar un producto", 1000);
      return;
    }

    const existingCartItem = this.findCartItemById(id);

    if (existingCartItem) {
      this.incrementCartItemAmount(existingCartItem);
    } else {
      this.addNewCartItem(id);
    }

    this.config.modalTemp.modal("hide");
    this.showAlert("success", "Agregado correctamente", 400, "top-end");
  };

  validateAndShowAlert = (value) => {
    let result = true;
    if (value <= 0) {
      this.showAlert(
        "error",
        "No se permiten valores menores o iguales a 0",
        1500,
        "top-end"
      );
      result = false;
    }
    return result;
  };

  updateAmount(event) {
    const input = $(event.target);
    const id = input.data("id");
    const minValue = 1;
    let newAmount = parseInt(input.val());

    if (!this.validateAndShowAlert(newAmount)) {
      input.val(minValue);
      newAmount = minValue;
    }

    const dataAmount = this.dataCart.find((element) => element.id == id);
    dataAmount.amount = newAmount;
  }

  addFormatActionsTemp(data) {
    data.forEach((element) => {
      element.acciones = this.config.formatActionsTemp(element).acciones;
      element.amount_input =
        this.config.formatActionsTemp(element).amount_input;
    });
    this.config.tableCartTemp.bootstrapTable("load", data);
  }

  deleteCart(event) {
    const id = $(event.target).data("id");
    this.dataCart = this.dataCart.filter((element) => element.id != id);
    this.updateTempTable();
  }

  updateTempTable() {
    if (this.config.tableCartTemp) {
      this.config.tableCartTemp.bootstrapTable("load", this.dataCart);
    }
  }

  assembleObjectClientTemp() {
    const dataClient = this.assembleObjectClient();
    const cartRelation = this.config.cartRelation;
    dataClient[cartRelation] = this.dataCart;
    if (this.config.inputChecks != undefined) {
      const inputChecks = this.config.inputChecks;
      inputChecks.forEach((element) => {
        const name = element.attr("id");
        dataClient[name] = element.prop("checked") ? 1 : 0;
      });
    }
    return dataClient;
  }

  async saveCart() {
    if (!this.validateInsert()) {
      return;
    }
    try {
      const endpoint =
        this.config.endPointHandler != undefined
          ? this.config.endPointHandler
          : this.entity;

      const url = `${endpoint}/store`;
      const data = this.assembleObjectClientTemp();
      this.showLoader();
      const response = await this.apiClient.post(url, data);
      const dataResponse = await response.json();
      this.hideLoader();
      if (dataResponse.status == 201) {
        this.showAlert("success", "Registro insertado correctamente", 1000);
        setTimeout(() => {
          this.hrefPage(entity);
        }, 1100);
      } else {
        this.showAlert("error", "Error al insertar el registro", 1500);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async updateCart() {
    if (!this.validateInsert()) {
      return;
    }
    try {
      const endpoint =
        this.config.endPointHandler != undefined
          ? this.config.endPointHandler
          : this.entity;

      const url = `${endpoint}/update`;
      const data = this.assembleObjectClientTemp();
      this.showLoader();
      const response = await this.apiClient.post(url, data);
      const dataResponse = await response.json();
      this.hideLoader();
      if (dataResponse.status == 200) {
        this.showAlert("success", "Registro actualizado correctamente", 1000);
        setTimeout(() => {
          this.hrefPage(entity);
        }, 1100);
      } else {
        this.showAlert("error", "Error al actualizar el registro", 1500);
      }
    } catch (error) {
      console.log(error);
    }
  }

  showLoader() {
    const loader = this.config.loaderSecondary;
    if (loader != undefined) {
      loader.show();
    }
  }

  hideLoader() {
    const loader = this.config.loaderSecondary;
    if (loader != undefined) {
      loader.hide();
    }
  }

  hrefPage(endpoint) {
    const newLink = document.createElement("a");
    newLink.href = `${urlLocal}/${endpoint}`;
    newLink.click();
  }

  dataCartInitEdit() {}
}
