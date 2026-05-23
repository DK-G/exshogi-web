type ModuleOptions = {
  print?: (text: string) => void;
  printErr?: (text: string) => void;
};

type NshogiModule = {
  ccall: (
    name: string,
    returnType: string,
    argTypes: string[],
    args: Array<string | number>,
  ) => string;
};

export default function createModule(
  options?: ModuleOptions,
): Promise<NshogiModule>;
