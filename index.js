import prompts from "prompts";
import chalk from "chalk";

const ayovue = async () => {
  const response = await prompts({
    type: "select",
    name: "value",
    message: chalk.bold("What do you want to create?"),
    choices: [
      {
        title: chalk.green("Component"),
        value: "component",
      },
      { title: chalk.green("Composable"), value: "composable" },
    ],
    initial: 0,
  });
  if (response.value === "component") {
  }
};

await ayovue();
