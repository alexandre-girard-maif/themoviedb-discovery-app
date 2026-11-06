import type { Meta, StoryObj } from '@storybook/react-vite';
import HelloWorld from './HelloWorld';

const meta = {
  title: 'Components/HelloWorld',
  component: HelloWorld,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Overrides the default Hello World! message.',
    },
  },
} satisfies Meta<typeof HelloWorld>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: {
    message: 'Welcome to Storybook!',
  },
};

export const DarkTheme: Story = {
  globals: {
    theme: 'dark',
  },
};
