using Avalonia.Controls;
using Avalonia.Interactivity;

namespace MajdataPlayUpdater.Views;

public partial class Dialog : Window
{
    public Dialog()
    {
        InitializeComponent();
    }

    public Dialog(string title, string content)
    {
        InitializeComponent();
        Title = title;
        ContentTextBlock.Text = content;
    }

    private void OnCloseClick(object? sender, RoutedEventArgs e)
    {
        Close();
    }
}