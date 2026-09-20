import { fireEvent, render, screen } from "@testing-library/react-native";
import { danger, radius, surface, text } from "@royal-navy/shared";

import { Input } from "./index";

describe("Input", () => {
  it("renders a field of at least 50 dp with radius 17, the input border, no fill and 15 dp white text", () => {
    render(<Input placeholder="Email" value="" onChangeText={jest.fn()} />);

    expect(screen.getByTestId("input-field")).toHaveStyle({
      minHeight: 50,
      borderRadius: radius.input,
      borderWidth: surface.inputBorder.width,
      borderColor: surface.inputBorder.color,
      backgroundColor: "transparent",
      fontSize: 15,
      color: text.primary,
      fontFamily: "Baloo2-SemiBold",
    });
  });

  it("renders the label 7 dp above the field, 14 dp for 1b and 15 dp for 1a", () => {
    const { rerender } = render(<Input label="Game name" value="" onChangeText={jest.fn()} weight={700} />);

    expect(screen.getByText("Game name")).toHaveStyle({ fontSize: 14, color: text.secondary, marginBottom: 7 });
    expect(screen.getByLabelText("Game name")).toHaveStyle({ fontFamily: "Baloo2-Bold" });

    rerender(<Input label="Email" labelSize={15} value="" onChangeText={jest.fn()} />);
    expect(screen.getByText("Email")).toHaveStyle({ fontSize: 15 });
  });

  it("reports text changes", () => {
    const onChangeText = jest.fn();
    render(<Input placeholder="Email" value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "naveen@example.com");
    expect(onChangeText).toHaveBeenCalledWith("naveen@example.com");
  });

  it("shows an inline danger error and a danger border", () => {
    render(<Input placeholder="Email" value="x" onChangeText={jest.fn()} error="Enter a valid email." />);

    expect(screen.getByText("Enter a valid email.")).toHaveStyle({ color: danger.text, marginTop: 6 });
    expect(screen.getByTestId("input-field")).toHaveStyle({ borderColor: danger.strong });
  });

  it("renders disabled at 45% when not editable", () => {
    render(<Input placeholder="Email" value="x" onChangeText={jest.fn()} editable={false} />);

    expect(screen.getByTestId("input-field")).toHaveStyle({ opacity: 0.45 });
  });
});
