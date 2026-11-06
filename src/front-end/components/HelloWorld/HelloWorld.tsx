import './HelloWorld.css';

interface HelloWorldProps {
  message?: string;
}

/**
 * A simple HelloWorld component that displays a message.
 * @param message The message to display. Defaults to 'Hello World!'.
 */
export default function HelloWorld({
  message = 'Hello World!',
}: HelloWorldProps) {
  return <p className="hello-world">{message}</p>;
}
