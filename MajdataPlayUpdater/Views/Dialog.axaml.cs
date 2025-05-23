using System;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Layout;

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

    public void AddButton(string content, Action action)
    {
        var button = new Button { Content = content, MinWidth = 80, HorizontalAlignment = HorizontalAlignment.Center};
        button.Click += (sender, e) => { action.Invoke(); };
        ButtonStackPanel.Children.Add(button);
    }

    public void AddButton(string content, Func<Task> asyncAction)
    {
        var button = new Button { Content = content, MinWidth = 80, HorizontalAlignment = HorizontalAlignment.Center };
        button.Click += async (s, e) => await asyncAction();
        ButtonStackPanel.Children.Add(button);
    }

    private void OnCloseClick(object? sender, RoutedEventArgs e) => Close();
}