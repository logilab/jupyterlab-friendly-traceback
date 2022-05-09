import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from "@jupyterlab/application";
import { DocumentRegistry } from "@jupyterlab/docregistry";
import {
  INotebookTracker,
  INotebookModel,
  NotebookPanel,
} from "@jupyterlab/notebook";
import { DisposableDelegate, IDisposable } from "@lumino/disposable";
import { ToolbarButton } from "@jupyterlab/apputils";
import { LabIcon } from "@jupyterlab/ui-components";

import friendlySvgStr from "../style/friendly.svg";

const friendlyIcon = new LabIcon({
  name: "Friendly",
  svgstr: friendlySvgStr,
});

export class FriendlyButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  protected _enabled: boolean | null = null;

  revert = () => {
    this._enabled = false;
  };

  public createNew(panel: NotebookPanel): IDisposable {
    const callback = () => {
      this.friendly(panel);
      toggleButtonState();
    };

    const friendlyButton = new ToolbarButton({
      className: "friendly-button",
      icon: friendlyIcon,
      onClick: callback,
      tooltip: "Activate/DeActivate the friendly traceback",
    });

    // handle kernel restart
    panel.context.sessionContext.kernelChanged.connect(async () => {
      const session = panel.context.sessionContext.session;
      if (session) {
        let code =
          "from friendly.jupyter import *; from friendly.ipython_common.excepthook import enable, disable";
        if (!this._enabled) {
          code = code + ";disable()";
        }
        session.kernel.requestExecute({
          code,
        });
      }
    });

    const toggleButtonState = () => {
      const activeClass = "friendly-button-active";
      if (this._enabled) {
        friendlyButton.addClass(activeClass);
      } else {
        friendlyButton.removeClass(activeClass);
      }
    };

    panel.toolbar.insertItem(0, "friendly", friendlyButton);
    return new DisposableDelegate(() => {
      friendlyButton.dispose();
    });
  }

  // launch friendly
  protected friendly = (panel: NotebookPanel) => {
    const kernelConnection = panel.context.sessionContext.session.kernel;
    let code = "";
    switch (this._enabled) {
      case null:
        code =
          "from friendly.jupyter import *; from friendly.ipython_common.excepthook import enable, disable";
        this._enabled = true;
        break;
      case true:
        code = "disable()";
        this._enabled = false;
        break;
      case false:
        code = "enable()";
        this._enabled = true;
        break;
    }
    kernelConnection.requestExecute({
      code,
    });
  };
}

const friendlyExtension: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab-friendly-traceback",
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
    console.log("jupyterlab-friendly-traceback is activated!");
    const fButton = new FriendlyButton();
    app.docRegistry.addWidgetExtension("Notebook", fButton);

    // handle re-open notebook
    tracker.currentChanged.connect(async () => {
      fButton.revert();
    });
  },
};

export default friendlyExtension;
