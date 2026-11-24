import { use } from "react";

import { ShellContext } from "./shell-context";

export const useShell = () => use(ShellContext);
